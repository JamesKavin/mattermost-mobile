// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markChannelAsViewed} from '@actions/local/channel';
import {markChannelAsRead} from '@actions/remote/channel';
import {handleEntryAfterLoadNavigation} from '@actions/remote/entry/common';
import {deferredAppEntryActions, entry} from '@actions/remote/entry/gql_common';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {fetchStatusByIds} from '@actions/remote/user';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {
    handleCallChannelDisabled,
    handleCallChannelEnabled,
    handleCallEnded,
    handleCallHostChanged,
    handleCallRecordingState,
    handleCallScreenOff,
    handleCallScreenOn,
    handleCallStarted,
    handleCallUserConnected,
    handleCallUserDisconnected,
    handleCallUserMuted,
    handleCallUserRaiseHand,
    handleCallUserReacted,
    handleCallUserUnmuted,
    handleCallUserUnraiseHand,
    handleCallUserVoiceOff,
    handleCallUserVoiceOn,
} from '@calls/connection/websocket_event_handlers';
import {isSupportedServerCalls} from '@calls/utils';
import {Screens, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import {getCurrentChannel} from '@queries/servers/channel';
import {getLastPostInThread} from '@queries/servers/post';
import {
    getConfig,
    getCurrentChannelId,
    getCurrentUserId,
    getLicense,
    getWebSocketLastDisconnected,
    resetWebSocketLastDisconnected,
} from '@queries/servers/system';
import {getCurrentTeam} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {setTeamLoading} from '@store/team_load_store';
import {isTablet} from '@utils/helpers';
import {logDebug, logInfo} from '@utils/log';

import {handleCategoryCreatedEvent, handleCategoryDeletedEvent, handleCategoryOrderUpdatedEvent, handleCategoryUpdatedEvent} from './category';
import {handleChannelConvertedEvent, handleChannelCreatedEvent,
    handleChannelDeletedEvent,
    handleChannelMemberUpdatedEvent,
    handleChannelUnarchiveEvent,
    handleChannelUpdatedEvent,
    handleChannelViewedEvent,
    handleDirectAddedEvent,
    handleUserAddedToChannelEvent,
    handleUserRemovedFromChannelEvent} from './channel';
import {handleGroupMemberAddEvent, handleGroupMemberDeleteEvent, handleGroupReceivedEvent, handleGroupTeamAssociatedEvent, handleGroupTeamDissociateEvent} from './group';
import {handleOpenDialogEvent} from './integrations';
import {handleNewPostEvent, handlePostDeleted, handlePostEdited, handlePostUnread} from './posts';
import {handlePreferenceChangedEvent, handlePreferencesChangedEvent, handlePreferencesDeletedEvent} from './preferences';
import {handleAddCustomEmoji, handleReactionRemovedFromPostEvent, handleReactionAddedToPostEvent} from './reactions';
import {handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent, handleRoleUpdatedEvent} from './roles';
import {handleLicenseChangedEvent, handleConfigChangedEvent} from './system';
import {handleLeaveTeamEvent, handleUserAddedToTeamEvent, handleUpdateTeamEvent, handleTeamArchived, handleTeamRestored} from './teams';
import {handleThreadUpdatedEvent, handleThreadReadChangedEvent, handleThreadFollowChangedEvent} from './threads';
import {handleUserUpdatedEvent, handleUserTypingEvent} from './users';

// ESR: 5.37
const alreadyConnected = new Set<string>();

export async function handleFirstConnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const {database} = operator;
    const config = await getConfig(database);
    const lastDisconnect = await getWebSocketLastDisconnected(database);

    // ESR: 5.37
    if (lastDisconnect && config?.EnableReliableWebSockets !== 'true' && alreadyConnected.has(serverUrl)) {
        await handleReconnect(serverUrl);
        return;
    }

    alreadyConnected.add(serverUrl);
    resetWebSocketLastDisconnected(operator);
    fetchStatusByIds(serverUrl, ['me']);

    if (isSupportedServerCalls(config?.Version)) {
        const currentUserId = await getCurrentUserId(database);
        loadConfigAndCalls(serverUrl, currentUserId);
    }
}

export async function handleReconnect(serverUrl: string) {
    await doReconnect(serverUrl);
}

export async function handleClose(serverUrl: string, lastDisconnect: number) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    await operator.handleSystem({
        systems: [
            {
                id: SYSTEM_IDENTIFIERS.WEBSOCKET,
                value: lastDisconnect.toString(10),
            },
        ],
        prepareRecordsOnly: false,
    });
}

async function doReconnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return;
    }

    const {database} = operator;

    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);
    resetWebSocketLastDisconnected(operator);

    const currentTeam = await getCurrentTeam(database);
    const currentChannel = await getCurrentChannel(database);

    setTeamLoading(serverUrl, true);
    const entryData = await entry(serverUrl, currentTeam?.id, currentChannel?.id, lastDisconnectedAt);
    if ('error' in entryData) {
        setTeamLoading(serverUrl, false);
        return;
    }
    const {models, initialTeamId, initialChannelId, prefData, teamData, chData} = entryData;

    await handleEntryAfterLoadNavigation(serverUrl, teamData.memberships || [], chData?.memberships || [], currentTeam?.id || '', currentChannel?.id || '', initialTeamId, initialChannelId);

    const dt = Date.now();
    await operator.batchRecords(models);
    logInfo('WEBSOCKET RECONNECT MODELS BATCHING TOOK', `${Date.now() - dt}ms`);
    setTeamLoading(serverUrl, false);

    await fetchPostDataIfNeeded(serverUrl);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(database))!;
    const license = await getLicense(database);
    const config = await getConfig(database);

    if (isSupportedServerCalls(config?.Version)) {
        loadConfigAndCalls(serverUrl, currentUserId);
    }

    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    AppsManager.refreshAppBindings(serverUrl);
}

export async function handleEvent(serverUrl: string, msg: WebSocketMessage) {
    switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:
            handleNewPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.POST_EDITED:
            handlePostEdited(serverUrl, msg);
            break;

        case WebsocketEvents.POST_DELETED:
            handlePostDeleted(serverUrl, msg);
            break;

        case WebsocketEvents.POST_UNREAD:
            handlePostUnread(serverUrl, msg);
            break;

        case WebsocketEvents.LEAVE_TEAM:
            handleLeaveTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.UPDATE_TEAM:
            handleUpdateTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ADDED_TO_TEAM:
            handleUserAddedToTeamEvent(serverUrl, msg);
            break;

        case WebsocketEvents.USER_ADDED:
            handleUserAddedToChannelEvent(serverUrl, msg);
            break;
        case WebsocketEvents.USER_REMOVED:
            handleUserRemovedFromChannelEvent(serverUrl, msg);
            break;
        case WebsocketEvents.USER_UPDATED:
            handleUserUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ROLE_UPDATED:
            handleRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.USER_ROLE_UPDATED:
            handleUserRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.MEMBERROLE_UPDATED:
            handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CATEGORY_CREATED:
            handleCategoryCreatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_UPDATED:
            handleCategoryUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_ORDER_UPDATED:
            handleCategoryOrderUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_DELETED:
            handleCategoryDeletedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CREATED:
            handleChannelCreatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_DELETED:
            handleChannelDeletedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_UNARCHIVED:
            handleChannelUnarchiveEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_UPDATED:
            handleChannelUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CONVERTED:
            handleChannelConvertedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_VIEWED:
            handleChannelViewedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:
            handleChannelMemberUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:
            // Do nothing, handled by CHANNEL_UPDATED due to changes in the channel scheme.
            break;

        case WebsocketEvents.DIRECT_ADDED:
        case WebsocketEvents.GROUP_ADDED:
            handleDirectAddedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCE_CHANGED:
            handlePreferenceChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCES_CHANGED:
            handlePreferencesChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCES_DELETED:
            handlePreferencesDeletedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.STATUS_CHANGED:
            break;

        // return dispatch(handleStatusChangedEvent(msg));
        case WebsocketEvents.TYPING:
            handleUserTypingEvent(serverUrl, msg);
            break;

        case WebsocketEvents.REACTION_ADDED:
            handleReactionAddedToPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.REACTION_REMOVED:
            handleReactionRemovedFromPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.EMOJI_ADDED:
            handleAddCustomEmoji(serverUrl, msg);
            break;

        case WebsocketEvents.LICENSE_CHANGED:
            handleLicenseChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CONFIG_CHANGED:
            handleConfigChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.OPEN_DIALOG:
            handleOpenDialogEvent(serverUrl, msg);
            break;

        case WebsocketEvents.DELETE_TEAM:
            handleTeamArchived(serverUrl, msg);
            break;

        case WebsocketEvents.RESTORE_TEAM:
            handleTeamRestored(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_UPDATED:
            handleThreadUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_READ_CHANGED:
            handleThreadReadChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_FOLLOW_CHANGED:
            handleThreadFollowChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.APPS_FRAMEWORK_REFRESH_BINDINGS:
            break;

            // return dispatch(handleRefreshAppsBindings());

        // Calls ws events:
        case WebsocketEvents.CALLS_CHANNEL_ENABLED:
            handleCallChannelEnabled(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CHANNEL_DISABLED:
            handleCallChannelDisabled(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_CONNECTED:
            handleCallUserConnected(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_DISCONNECTED:
            handleCallUserDisconnected(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_MUTED:
            handleCallUserMuted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_UNMUTED:
            handleCallUserUnmuted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_VOICE_ON:
            handleCallUserVoiceOn(msg);
            break;
        case WebsocketEvents.CALLS_USER_VOICE_OFF:
            handleCallUserVoiceOff(msg);
            break;
        case WebsocketEvents.CALLS_CALL_START:
            handleCallStarted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_SCREEN_ON:
            handleCallScreenOn(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_SCREEN_OFF:
            handleCallScreenOff(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_RAISE_HAND:
            handleCallUserRaiseHand(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_UNRAISE_HAND:
            handleCallUserUnraiseHand(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_CALL_END:
            handleCallEnded(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_USER_REACTED:
            handleCallUserReacted(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_RECORDING_STATE:
            handleCallRecordingState(serverUrl, msg);
            break;
        case WebsocketEvents.CALLS_HOST_CHANGED:
            handleCallHostChanged(serverUrl, msg);
            break;

        case WebsocketEvents.GROUP_RECEIVED:
            handleGroupReceivedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_MEMBER_ADD:
            handleGroupMemberAddEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_MEMBER_DELETE:
            handleGroupMemberDeleteEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_ASSOCIATED_TO_TEAM:
            handleGroupTeamAssociatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_DISSOCIATED_TO_TEAM:
            handleGroupTeamDissociateEvent(serverUrl, msg);
            break;
        case WebsocketEvents.GROUP_ASSOCIATED_TO_CHANNEL:
            break;
        case WebsocketEvents.GROUP_DISSOCIATED_TO_CHANNEL:
            break;
    }
}

async function fetchPostDataIfNeeded(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentChannelId = await getCurrentChannelId(database);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const mountedScreens = NavigationStore.getScreensInStack();
        const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);
        const isThreadScreenMounted = mountedScreens.includes(Screens.THREAD);
        const tabletDevice = await isTablet();

        if (isCRTEnabled && isThreadScreenMounted) {
            // Fetch new posts in the thread only when CRT is enabled,
            // for non-CRT fetchPostsForChannel includes posts in the thread
            const rootId = EphemeralStore.getCurrentThreadId();
            if (rootId) {
                const lastPost = await getLastPostInThread(database, rootId);
                if (lastPost) {
                    if (lastPost) {
                        const options: FetchPaginatedThreadOptions = {};
                        options.fromCreateAt = lastPost.createAt;
                        options.fromPost = lastPost.id;
                        options.direction = 'down';
                        await fetchPostThread(serverUrl, rootId, options);
                    }
                }
            }
        }

        if (currentChannelId && (isChannelScreenMounted || tabletDevice)) {
            await fetchPostsForChannel(serverUrl, currentChannelId);
            markChannelAsRead(serverUrl, currentChannelId);
            if (!EphemeralStore.wasNotificationTapped()) {
                markChannelAsViewed(serverUrl, currentChannelId, true);
            }
            EphemeralStore.setNotificationTapped(false);
        }
    } catch (error) {
        logDebug('could not fetch needed post after WS reconnect', error);
    }
}
