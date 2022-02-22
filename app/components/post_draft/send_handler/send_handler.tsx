// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {getChannelMemberCountsByGroup, getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import {setStatus} from '@actions/remote/user';
import {Events, Screens} from '@constants';
import {NOTIFY_ALL_MEMBERS} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import DraftUploadManager from '@init/draft_upload_manager';
import * as DraftUtils from '@utils/draft';
import {isReactionMatch} from '@utils/emoji/helpers';
import {preventDoubleTap} from '@utils/tap';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import DraftInput from '../draft_input';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type GroupModel from '@typings/database/models/servers/group';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;

    // From database
    currentUserId: string;
    cursorPosition: number;
    enableConfirmNotificationsToChannel?: boolean;
    isTimezoneEnabled: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;
    useGroupMentions: boolean;
    groupsWithAllowReference: GroupModel[];
    customEmojis: CustomEmojiModel[];

    // DRAFT Handler
    value: string;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: (message: string) => void;
    updateCursorPosition: (cursorPosition: number) => void;
    updatePostInputTop: (top: number) => void;
    addFiles: (file: FileInfo[]) => void;
    uploadFileError: React.ReactNode;
}

export default function SendHandler({
    testID,
    channelId,
    currentUserId,
    enableConfirmNotificationsToChannel,
    files,
    isTimezoneEnabled,
    maxMessageLength,
    membersCount = 0,
    cursorPosition,
    rootId,
    useChannelMentions,
    userIsOutOfOffice,
    customEmojis,
    value,
    useGroupMentions,
    groupsWithAllowReference,
    clearDraft,
    updateValue,
    addFiles,
    uploadFileError,
    updateCursorPosition,
    updatePostInputTop,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [channelMemberCountsByGroup, setChannelMemberCountsByGroup] = useState<ChannelMemberCountByGroup[]>([]);

    const canSend = useCallback(() => {
        if (sendingMessage) {
            return false;
        }

        const messageLength = value.trim().length;

        if (messageLength > maxMessageLength) {
            return false;
        }

        if (files.length) {
            const loadingComplete = !files.some((file) => DraftUploadManager.isUploading(file.clientId!));
            return loadingComplete;
        }

        return messageLength > 0;
    }, [sendingMessage, value, files, maxMessageLength]);

    const handleReaction = useCallback((emoji: string, add: boolean) => {
        handleReactionToLatestPost(serverUrl, emoji, add, rootId);
        clearDraft();
        setSendingMessage(false);
    }, [serverUrl, rootId, clearDraft]);

    const doSubmitMessage = useCallback(() => {
        const postFiles = files.filter((f) => !f.failed);
        const post = {
            user_id: currentUserId,
            channel_id: channelId,
            root_id: rootId,
            message: value,
        };

        createPost(serverUrl, post, postFiles);

        clearDraft();
        setSendingMessage(false);
        DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
    }, [files, currentUserId, channelId, rootId, value, clearDraft]);

    const showSendToAllOrChannelOrHereAlert = useCallback((calculatedMembersCount: number, atHere: boolean) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, Boolean(isTimezoneEnabled), channelTimezoneCount, atHere);
        const cancel = () => {
            setSendingMessage(false);
        };

        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessage, cancel);
    }, [intl, isTimezoneEnabled, channelTimezoneCount, doSubmitMessage]);

    const showSendToGroupsAlert = useCallback((groupMentions: string[], memberNotifyCount: number, calculatedChannelTimezoneCount: number) => {
        const notifyAllMessage = DraftUtils.buildGroupMentionsMessage(intl, groupMentions, memberNotifyCount, calculatedChannelTimezoneCount);
        const cancel = () => {
            setSendingMessage(false);
        };

        DraftUtils.alertSendToGroups(intl, notifyAllMessage, doSubmitMessage, cancel);
    }, [intl, doSubmitMessage]);

    const sendCommand = useCallback(async () => {
        const status = DraftUtils.getStatusFromSlashCommand(value);
        if (userIsOutOfOffice && status) {
            const updateStatus = (newStatus: string) => {
                setStatus(serverUrl, {
                    status: newStatus,
                    last_activity_at: Date.now(),
                    manual: true,
                    user_id: currentUserId,
                });
            };
            confirmOutOfOfficeDisabled(intl, status, updateStatus);
            setSendingMessage(false);
            return;
        }

        const {data, error} = await executeCommand(serverUrl, intl, value, channelId, rootId);
        setSendingMessage(false);

        if (error) {
            const errorMessage = typeof (error) === 'string' ? error : error.message;
            DraftUtils.alertSlashCommandFailed(intl, errorMessage);
            return;
        }

        clearDraft();

        // TODO Apps related https://mattermost.atlassian.net/browse/MM-41233
        // if (data?.form) {
        //     showAppForm(data.form, data.call, theme);
        // }

        if (data?.goto_location) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [userIsOutOfOffice, currentUserId, intl, value, serverUrl, channelId, rootId]);

    const sendMessage = useCallback(() => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const notificationsToGroups = enableConfirmNotificationsToChannel && useGroupMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);
        const groupMentions = (!toAllOrChannel && !toHere && notificationsToGroups) ? DraftUtils.groupsMentionedInText(groupsWithAllowReference, value) : [];

        if (value.indexOf('/') === 0) {
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel);
        } else if (groupMentions.length > 0) {
            const {
                groupMentionsSet,
                memberNotifyCount,
                channelTimezoneCount: calculatedChannelTimezoneCount,
            } = DraftUtils.mapGroupMentions(channelMemberCountsByGroup, groupMentions);
            if (memberNotifyCount > 0) {
                showSendToGroupsAlert(Array.from(groupMentionsSet), memberNotifyCount, calculatedChannelTimezoneCount);
            } else {
                doSubmitMessage();
            }
        } else {
            doSubmitMessage();
        }
    }, [
        enableConfirmNotificationsToChannel,
        useChannelMentions,
        useGroupMentions,
        value,
        groupsWithAllowReference,
        channelTimezoneCount,
        channelMemberCountsByGroup,
        sendCommand,
        showSendToAllOrChannelOrHereAlert,
        showSendToGroupsAlert,
        doSubmitMessage,
    ]);

    const handleSendMessage = useCallback(preventDoubleTap(() => {
        if (!canSend()) {
            return;
        }

        setSendingMessage(true);

        const match = isReactionMatch(value, customEmojis);
        if (match && !files.length) {
            handleReaction(match.emoji, match.add);
            return;
        }

        const hasFailedAttachments = files.some((f) => f.failed);
        if (hasFailedAttachments) {
            const cancel = () => {
                setSendingMessage(false);
            };
            const accept = () => {
                // Files are filtered on doSubmitMessage
                sendMessage();
            };

            DraftUtils.alertAttachmentFail(intl, accept, cancel);
        } else {
            sendMessage();
        }
    }), [canSend, value, handleReaction, files, sendMessage, customEmojis]);

    useEffect(() => {
        if (useGroupMentions) {
            getChannelMemberCountsByGroup(serverUrl, channelId, isTimezoneEnabled).then((resp) => {
                if (resp.error) {
                    return;
                }

                const received = resp.channelMemberCountsByGroup || [];
                if (received.length || channelMemberCountsByGroup.length) {
                    setChannelMemberCountsByGroup(received);
                }
            });
        }
    }, [useGroupMentions, channelId, isTimezoneEnabled, channelMemberCountsByGroup.length]);

    useEffect(() => {
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [serverUrl, channelId]);

    return (
        <DraftInput
            testID={testID}
            channelId={channelId}
            rootId={rootId}
            cursorPosition={cursorPosition}
            updateCursorPosition={updateCursorPosition}
            value={value}
            files={files}
            updateValue={updateValue}
            addFiles={addFiles}
            uploadFileError={uploadFileError}
            sendMessage={handleSendMessage}
            canSend={canSend()}
            maxMessageLength={maxMessageLength}
            updatePostInputTop={updatePostInputTop}
        />
    );
}
