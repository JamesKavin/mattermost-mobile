// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {getChannelTimezones} from '@actions/remote/channel';
import {executeCommand, handleGotoLocation} from '@actions/remote/command';
import {createPost} from '@actions/remote/post';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import {setStatus} from '@actions/remote/user';
import {canEndCall, endCall, getEndCallMessage} from '@calls/actions/calls';
import ClientError from '@client/rest/error';
import {Events, Screens} from '@constants';
import {PostPriorityType} from '@constants/post';
import {NOTIFY_ALL_MEMBERS} from '@constants/post_draft';
import {useServerUrl} from '@context/server';
import DraftUploadManager from '@managers/draft_upload_manager';
import * as DraftUtils from '@utils/draft';
import {isReactionMatch} from '@utils/emoji/helpers';
import {preventDoubleTap} from '@utils/tap';
import {confirmOutOfOfficeDisabled} from '@utils/user';

import DraftInput from '../draft_input';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;
    canShowPostPriority?: boolean;
    setIsFocused: (isFocused: boolean) => void;

    // From database
    currentUserId: string;
    cursorPosition: number;
    enableConfirmNotificationsToChannel?: boolean;
    isTimezoneEnabled: boolean;
    maxMessageLength: number;
    membersCount?: number;
    useChannelMentions: boolean;
    userIsOutOfOffice: boolean;
    customEmojis: CustomEmojiModel[];

    // DRAFT Handler
    value: string;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    updatePostInputTop: (top: number) => void;
    addFiles: (file: FileInfo[]) => void;
    uploadFileError: React.ReactNode;
}

const INITIAL_PRIORITY = {
    priority: PostPriorityType.STANDARD,
};

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
    canShowPostPriority,
    useChannelMentions,
    userIsOutOfOffice,
    customEmojis,
    value,
    clearDraft,
    updateValue,
    addFiles,
    uploadFileError,
    updateCursorPosition,
    updatePostInputTop,
    setIsFocused,
}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const [channelTimezoneCount, setChannelTimezoneCount] = useState(0);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [postPriority, setPostPriority] = useState<PostPriorityData>(INITIAL_PRIORITY);

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
        } as Post;

        if (Object.keys(postPriority).length) {
            post.metadata = {
                priority: postPriority,
            };
        }

        createPost(serverUrl, post, postFiles);

        clearDraft();
        setSendingMessage(false);
        setPostPriority(INITIAL_PRIORITY);
        DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, rootId ? Screens.THREAD : Screens.CHANNEL);
    }, [files, currentUserId, channelId, rootId, value, clearDraft, postPriority]);

    const showSendToAllOrChannelOrHereAlert = useCallback((calculatedMembersCount: number, atHere: boolean) => {
        const notifyAllMessage = DraftUtils.buildChannelWideMentionMessage(intl, calculatedMembersCount, Boolean(isTimezoneEnabled), channelTimezoneCount, atHere);
        const cancel = () => {
            setSendingMessage(false);
        };

        DraftUtils.alertChannelWideMention(intl, notifyAllMessage, doSubmitMessage, cancel);
    }, [intl, isTimezoneEnabled, channelTimezoneCount, doSubmitMessage]);

    const handleEndCall = useCallback(async () => {
        const hasPermissions = await canEndCall(serverUrl, channelId);

        if (!hasPermissions) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.calls_end_permission_title',
                    defaultMessage: 'Error',
                }),
                intl.formatMessage({
                    id: 'mobile.calls_end_permission_msg',
                    defaultMessage: 'You don\'t have permission to end the call. Please ask the call owner to end the call.',
                }));
            return;
        }

        const message = await getEndCallMessage(serverUrl, channelId, currentUserId, intl);
        const title = intl.formatMessage({id: 'mobile.calls_end_call_title', defaultMessage: 'End call'});

        Alert.alert(
            title,
            message,
            [
                {
                    text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                },
                {
                    text: title,
                    onPress: async () => {
                        try {
                            await endCall(serverUrl, channelId);
                        } catch (e) {
                            const err = (e as ClientError).message || 'unable to complete command, see server logs';
                            Alert.alert('Error', `Error: ${err}`);
                        }
                    },
                    style: 'cancel',
                },
            ],
        );
    }, [serverUrl, channelId, currentUserId, intl]);

    const sendCommand = useCallback(async () => {
        if (value.trim() === '/call end') {
            await handleEndCall();
            setSendingMessage(false);
            clearDraft();
            return;
        }

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

        if (data?.goto_location && !value.startsWith('/leave')) {
            handleGotoLocation(serverUrl, intl, data.goto_location);
        }
    }, [userIsOutOfOffice, currentUserId, intl, value, serverUrl, channelId, rootId, handleEndCall]);

    const sendMessage = useCallback(() => {
        const notificationsToChannel = enableConfirmNotificationsToChannel && useChannelMentions;
        const toAllOrChannel = DraftUtils.textContainsAtAllAtChannel(value);
        const toHere = DraftUtils.textContainsAtHere(value);

        if (value.indexOf('/') === 0) {
            sendCommand();
        } else if (notificationsToChannel && membersCount > NOTIFY_ALL_MEMBERS && (toAllOrChannel || toHere)) {
            showSendToAllOrChannelOrHereAlert(membersCount, toHere && !toAllOrChannel);
        } else {
            doSubmitMessage();
        }
    }, [
        enableConfirmNotificationsToChannel,
        useChannelMentions,
        value,
        channelTimezoneCount,
        sendCommand,
        showSendToAllOrChannelOrHereAlert,
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
        getChannelTimezones(serverUrl, channelId).then(({channelTimezones}) => {
            setChannelTimezoneCount(channelTimezones?.length || 0);
        });
    }, [serverUrl, channelId]);

    return (
        <DraftInput
            testID={testID}
            channelId={channelId}
            currentUserId={currentUserId}
            rootId={rootId}
            canShowPostPriority={canShowPostPriority}
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
            postPriority={postPriority}
            updatePostPriority={setPostPriority}
            setIsFocused={setIsFocused}
        />
    );
}
