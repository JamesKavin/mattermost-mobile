// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import InCallManager from 'react-native-incall-manager';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {fetchUsersByIds} from '@actions/remote/user';
import {needsRecordingWillBePostedAlert} from '@calls/alerts';
import {
    getCallsConfig,
    getCallsState,
    setCalls,
    setChannelEnabled,
    setConfig,
    setPluginEnabled,
    setScreenShareURL,
    setSpeakerPhone,
    setCallForChannel,
    newCurrentCall,
    myselfLeftCall,
} from '@calls/state';
import {General, Preferences} from '@constants';
import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {getConfig, getLicense} from '@queries/servers/system';
import {getCurrentUser, getUserById} from '@queries/servers/user';
import {logWarning} from '@utils/log';
import {displayUsername, getUserIdFromChannelName, isSystemAdmin} from '@utils/user';

import {newConnection} from '../connection/connection';

import type {
    ApiResp,
    Call,
    CallParticipant,
    CallReactionEmoji,
    CallsConnection,
    RecordingState,
    ServerCallState,
    ServerChannelState,
} from '@calls/types/calls';
import type {Client} from '@client/rest';
import type ClientError from '@client/rest/error';
import type {IntlShape} from 'react-intl';

let connection: CallsConnection | null = null;
export const getConnectionForTesting = () => connection;

export const loadConfig = async (serverUrl: string, force = false) => {
    const now = Date.now();
    const config = getCallsConfig(serverUrl);

    if (!force) {
        const lastRetrievedAt = config.last_retrieved_at || 0;
        if ((now - lastRetrievedAt) < Calls.RefreshConfigMillis) {
            return {data: config};
        }
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data;
    try {
        data = await client.getCallsConfig();
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    const nextConfig = {...data, last_retrieved_at: now};
    setConfig(serverUrl, nextConfig);
    return {data: nextConfig};
};

export const loadCalls = async (serverUrl: string, userId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }
    let resp: ServerChannelState[] = [];
    try {
        resp = await client.getCalls() || [];
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    const callsResults: Dictionary<Call> = {};
    const enabledChannels: Dictionary<boolean> = {};
    const ids = new Set<string>();

    for (const channel of resp) {
        if (channel.call) {
            callsResults[channel.channel_id] = createCallAndAddToIds(channel.channel_id, channel.call, ids);
        }

        if (typeof channel.enabled !== 'undefined') {
            enabledChannels[channel.channel_id] = channel.enabled;
        }
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids));
    }

    setCalls(serverUrl, userId, callsResults, enabledChannels);

    return {data: {calls: callsResults, enabled: enabledChannels}};
};

export const loadCallForChannel = async (serverUrl: string, channelId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let resp: ServerChannelState;
    try {
        resp = await client.getCallForChannel(channelId);
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    let call: Call | undefined;
    const ids = new Set<string>();
    if (resp.call) {
        call = createCallAndAddToIds(channelId, resp.call, ids);
    }

    // Batch load user models async because we'll need them later
    if (ids.size > 0) {
        fetchUsersByIds(serverUrl, Array.from(ids));
    }

    setCallForChannel(serverUrl, channelId, resp.enabled, call);

    return {data: {call, enabled: resp.enabled}};
};

const createCallAndAddToIds = (channelId: string, call: ServerCallState, ids: Set<string>) => {
    return {
        participants: call.users.reduce((accum, cur, curIdx) => {
            // Add the id to the set of UserModels we want to ensure are loaded.
            ids.add(cur);

            // Create the CallParticipant
            const muted = call.states && call.states[curIdx] ? !call.states[curIdx].unmuted : true;
            const raisedHand = call.states && call.states[curIdx] ? call.states[curIdx].raised_hand : 0;
            accum[cur] = {id: cur, muted, raisedHand};
            return accum;
        }, {} as Dictionary<CallParticipant>),
        channelId,
        startTime: call.start_at,
        screenOn: call.screen_sharing_id,
        threadId: call.thread_id,
        ownerId: call.owner_id,
        hostId: call.host_id,
        recState: call.recording,
    } as Call;
};

export const loadConfigAndCalls = async (serverUrl: string, userId: string) => {
    const res = await checkIsCallsPluginEnabled(serverUrl);
    if (res.data) {
        loadConfig(serverUrl, true);
        loadCalls(serverUrl, userId);
    }
};

export const checkIsCallsPluginEnabled = async (serverUrl: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data: ClientPluginManifest[] = [];
    try {
        data = await client.getPluginsManifests();
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    const enabled = data.findIndex((m) => m.id === Calls.PluginId) !== -1;
    const curEnabled = getCallsConfig(serverUrl).pluginEnabled;
    if (enabled !== curEnabled) {
        setPluginEnabled(serverUrl, enabled);
    }

    return {data: enabled};
};

export const enableChannelCalls = async (serverUrl: string, channelId: string, enable: boolean) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const res = await client.enableChannelCalls(channelId, enable);
        if (res.enabled === enable) {
            setChannelEnabled(serverUrl, channelId, enable);
        }
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }

    return {};
};

export const joinCall = async (serverUrl: string, channelId: string, userId: string, hasMicPermission: boolean): Promise<{ error?: string | Error; data?: string }> => {
    // Edge case: calls was disabled when app loaded, and then enabled, but app hasn't
    // reconnected its websocket since then (i.e., hasn't called batchLoadCalls yet)
    const {data: enabled} = await checkIsCallsPluginEnabled(serverUrl);
    if (!enabled) {
        return {error: 'calls plugin not enabled'};
    }

    if (connection) {
        connection.disconnect();
        connection = null;
    }
    setSpeakerphoneOn(false);
    newCurrentCall(serverUrl, channelId, userId);

    try {
        connection = await newConnection(serverUrl, channelId, () => {
            myselfLeftCall();
        }, setScreenShareURL, hasMicPermission);
    } catch (error: unknown) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error: error as Error};
    }

    try {
        await connection.waitForPeerConnection();
        return {data: channelId};
    } catch (e) {
        connection.disconnect();
        connection = null;
        return {error: `unable to connect to the voice call: ${e}`};
    }
};

export const leaveCall = () => {
    if (connection) {
        connection.disconnect();
        connection = null;
    }
    setSpeakerphoneOn(false);
};

export const muteMyself = () => {
    if (connection) {
        connection.mute();
    }
};

export const unmuteMyself = () => {
    if (connection) {
        connection.unmute();
    }
};

export const initializeVoiceTrack = () => {
    if (connection) {
        connection.initializeVoiceTrack();
    }
};

export const raiseHand = () => {
    if (connection) {
        connection.raiseHand();
    }
};

export const unraiseHand = () => {
    if (connection) {
        connection.unraiseHand();
    }
};

export const sendReaction = (emoji: CallReactionEmoji) => {
    if (connection) {
        connection.sendReaction(emoji);
    }
};

export const setSpeakerphoneOn = (speakerphoneOn: boolean) => {
    InCallManager.setSpeakerphoneOn(speakerphoneOn);
    setSpeakerPhone(speakerphoneOn);
};

export const canEndCall = async (serverUrl: string, channelId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return false;
    }

    const currentUser = await getCurrentUser(database);
    if (!currentUser) {
        return false;
    }

    const call = getCallsState(serverUrl).calls[channelId];
    if (!call) {
        return false;
    }

    return isSystemAdmin(currentUser.roles) || currentUser.id === call.ownerId;
};

export const getEndCallMessage = async (serverUrl: string, channelId: string, currentUserId: string, intl: IntlShape) => {
    let msg = intl.formatMessage({
        id: 'mobile.calls_end_msg_channel_default',
        defaultMessage: 'Are you sure you want to end the call?',
    });

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return msg;
    }

    const channel = await getChannelById(database, channelId);
    if (!channel) {
        return msg;
    }

    const call = getCallsState(serverUrl).calls[channelId];
    if (!call) {
        return msg;
    }

    const numParticipants = Object.keys(call.participants).length;

    msg = intl.formatMessage({
        id: 'mobile.calls_end_msg_channel',
        defaultMessage: 'Are you sure you want to end a call with {numParticipants} participants in {displayName}?',
    }, {numParticipants, displayName: channel.displayName});

    if (channel.type === General.DM_CHANNEL) {
        const otherID = getUserIdFromChannelName(currentUserId, channel.name);
        const otherUser = await getUserById(database, otherID);
        const license = await getLicense(database);
        const config = await getConfig(database);
        const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
        const displaySetting = getTeammateNameDisplaySetting(preferences, config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
        msg = intl.formatMessage({
            id: 'mobile.calls_end_msg_dm',
            defaultMessage: 'Are you sure you want to end the call with {displayName}?',
        }, {displayName: displayUsername(otherUser, intl.locale, displaySetting)});
    }

    return msg;
};

export const endCall = async (serverUrl: string, channelId: string) => {
    const client = NetworkManager.getClient(serverUrl);

    let data: ApiResp;
    try {
        data = await client.endCall(channelId);
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        throw error;
    }

    return data;
};

export const startCallRecording = async (serverUrl: string, callId: string) => {
    const client = NetworkManager.getClient(serverUrl);

    let data: ApiResp | RecordingState;
    try {
        data = await client.startCallRecording(callId);
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        logWarning('start call recording returned:', error);
        return error;
    }

    return data;
};

export const stopCallRecording = async (serverUrl: string, callId: string) => {
    needsRecordingWillBePostedAlert();

    const client = NetworkManager.getClient(serverUrl);

    let data: ApiResp | RecordingState;
    try {
        data = await client.stopCallRecording(callId);
    } catch (error) {
        await forceLogoutIfNecessary(serverUrl, error as ClientError);
        logWarning('stop call recording returned:', error);
        return error;
    }

    return data;
};
