// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {hasMicrophonePermission, joinCall, leaveCall, unmuteMyself} from '@calls/actions';
import {LimitRestrictedInfo} from '@calls/observers';
import {getCallsConfig, getCallsState, setMicPermissionsGranted} from '@calls/state';
import {errorAlert} from '@calls/utils';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModals, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {logError} from '@utils/log';
import {isSystemAdmin} from '@utils/user';

import type {IntlShape} from 'react-intl';

// Only allow one recording alert per call.
let recordingAlertLock = false;

// Only unlock if/when the user starts a recording.
let recordingWillBePostedLock = true;

export const showLimitRestrictedAlert = (info: LimitRestrictedInfo, intl: IntlShape) => {
    const title = intl.formatMessage({
        id: 'mobile.calls_participant_limit_title_GA',
        defaultMessage: 'This call is at capacity',
    });
    let message = intl.formatMessage({
        id: 'mobile.calls_limit_msg',
        defaultMessage: 'The maximum number of participants per call is {maxParticipants}. Contact your System Admin to increase the limit.',
    }, {maxParticipants: info.maxParticipants});
    if (info.isCloudStarter) {
        message = intl.formatMessage({
            id: 'mobile.calls_limit_msg_GA',
            defaultMessage: 'Upgrade to Cloud Professional or Cloud Enterprise to enable group calls with more than {maxParticipants} participants.',
        }, {maxParticipants: info.maxParticipants});
    }
    const ok = intl.formatMessage({
        id: 'mobile.calls_ok',
        defaultMessage: 'Okay',
    });

    Alert.alert(
        title,
        message,
        [
            {
                text: ok,
                style: 'cancel',
            },
        ],
    );
};

export const leaveAndJoinWithAlert = (
    intl: IntlShape,
    serverUrl: string,
    channelId: string,
    leaveChannelName: string,
    joinChannelName: string,
    confirmToJoin: boolean,
    newCall: boolean,
    isDMorGM: boolean,
) => {
    if (confirmToJoin) {
        const {formatMessage} = intl;

        let joinMessage = formatMessage({
            id: 'mobile.leave_and_join_message',
            defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and join the call in ~{joinChannelName}?',
        }, {leaveChannelName, joinChannelName});
        if (newCall) {
            joinMessage = formatMessage({
                id: 'mobile.leave_and_join_message',
                defaultMessage: 'You are already on a channel call in ~{leaveChannelName}. Do you want to leave your current call and start a new call in ~{joinChannelName}?',
            }, {leaveChannelName, joinChannelName});
        }

        Alert.alert(
            formatMessage({
                id: 'mobile.leave_and_join_title',
                defaultMessage: 'Are you sure you want to switch to a different call?',
            }),
            joinMessage,
            [
                {
                    text: formatMessage({
                        id: 'mobile.post.cancel',
                        defaultMessage: 'Cancel',
                    }),
                    style: 'destructive',
                },
                {
                    text: formatMessage({
                        id: 'mobile.leave_and_join_confirmation',
                        defaultMessage: 'Leave & Join',
                    }),
                    onPress: () => doJoinCall(serverUrl, channelId, isDMorGM, newCall, intl),
                    style: 'cancel',
                },
            ],
        );
    } else {
        doJoinCall(serverUrl, channelId, isDMorGM, newCall, intl);
    }
};

const doJoinCall = async (serverUrl: string, channelId: string, isDMorGM: boolean, newCall: boolean, intl: IntlShape) => {
    const {formatMessage} = intl;

    let user;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        user = await getCurrentUser(database);
        if (!user) {
            // This shouldn't happen, so don't bother localizing and displaying an alert.
            return;
        }

        if (newCall) {
            const enabled = getCallsState(serverUrl).enabled[channelId];
            const {DefaultEnabled} = getCallsConfig(serverUrl);
            const isAdmin = isSystemAdmin(user.roles);

            // if explicitly disabled, we wouldn't get to this point.
            // if pre-GA calls:
            //   if enabled is false, then this channel was returned as enabled=false from the server (it was either
            //     explicitly disabled, or DefaultEnabled=false), and the StartCall button would not be shown
            //   if enabled is true, then this channel was return as enabled=true from the server (it was either
            //     explicitly enabled, or DefaultEnabled=true), everyone can start
            // if GA calls:
            //   if explicitly enabled, everyone can start a call
            //   if !explicitly enabled and defaultEnabled, everyone can start
            //   if !explicitly enabled and !defaultEnabled, system admins can start, regular users get alert
            // Note: the below is a 'badly' coded if. But it's clear, which trumps.
            if (enabled || (!enabled && DefaultEnabled) || (!enabled && !DefaultEnabled && isAdmin)) {
                // continue through and start the call
            } else {
                contactAdminAlert(intl);
                return;
            }
        }
    } catch (error) {
        logError('failed to getServerDatabaseAndOperator in doJoinCall', error);
        return;
    }

    recordingAlertLock = false;
    recordingWillBePostedLock = true; // only unlock if/when the user stops a recording.
    const hasPermission = await hasMicrophonePermission();
    setMicPermissionsGranted(hasPermission);

    const res = await joinCall(serverUrl, channelId, user.id, hasPermission);
    if (res.error) {
        const seeLogs = formatMessage({id: 'mobile.calls_see_logs', defaultMessage: 'See server logs'});
        errorAlert(res.error?.toString() || seeLogs, intl);
        return;
    }

    if (isDMorGM) {
        // FIXME (MM-46048) - HACK
        // There's a race condition between unmuting and receiving existing tracks from other participants.
        // Fixing this properly requires extensive and potentially breaking changes.
        // Waiting for a second before unmuting is a decent workaround that should work in most cases.
        setTimeout(() => unmuteMyself(), 1000);
    }
};

const contactAdminAlert = ({formatMessage}: IntlShape) => {
    Alert.alert(
        formatMessage({
            id: 'mobile.calls_request_title',
            defaultMessage: 'Calls is not currently enabled',
        }),
        formatMessage({
            id: 'mobile.calls_request_message',
            defaultMessage: 'Calls are currently running in test mode and only system admins can start them. Reach out directly to your system admin for assistance',
        }),
        [{
            text: formatMessage({
                id: 'mobile.calls_okay',
                defaultMessage: 'Okay',
            }),
        }],
    );
};

export const recordingAlert = (isHost: boolean, intl: IntlShape) => {
    if (recordingAlertLock) {
        return;
    }
    recordingAlertLock = true;

    const {formatMessage} = intl;

    const participantTitle = formatMessage({
        id: 'mobile.calls_participant_rec_title',
        defaultMessage: 'Recording is in progress',
    });
    const hostTitle = formatMessage({
        id: 'mobile.calls_host_rec_title',
        defaultMessage: 'You are recording',
    });
    const participantMessage = formatMessage({
        id: 'mobile.calls_participant_rec',
        defaultMessage: 'The host has started recording this meeting. By staying in the meeting you give consent to being recorded.',
    });
    const hostMessage = formatMessage({
        id: 'mobile.calls_host_rec',
        defaultMessage: 'You are recording this meeting. Consider letting everyone know that this meeting is being recorded.',
    });

    const participantButtons = [
        {
            text: formatMessage({
                id: 'mobile.calls_leave',
                defaultMessage: 'Leave',
            }),
            onPress: async () => {
                leaveCall();

                // Need to pop the call screen, if it's somewhere in the stack.
                await dismissAllModals();
                if (NavigationStore.getScreensInStack().includes(Screens.CALL)) {
                    await dismissAllModalsAndPopToScreen(Screens.CALL, 'Call');
                    Navigation.pop(Screens.CALL).catch(() => null);
                }
            },
            style: 'destructive',
        },
        {
            text: formatMessage({
                id: 'mobile.calls_okay',
                defaultMessage: 'Okay',
            }),
            style: 'default',
        },
    ];
    const hostButton = [{
        text: formatMessage({
            id: 'mobile.calls_dismiss',
            defaultMessage: 'Dismiss',
        }),
    }];

    Alert.alert(
        isHost ? hostTitle : participantTitle,
        isHost ? hostMessage : participantMessage,
        isHost ? hostButton : participantButtons,
    );
};

export const needsRecordingWillBePostedAlert = () => {
    recordingWillBePostedLock = false;
};

export const recordingWillBePostedAlert = (intl: IntlShape) => {
    if (recordingWillBePostedLock) {
        return;
    }
    recordingWillBePostedLock = true;

    const {formatMessage} = intl;

    Alert.alert(
        formatMessage({
            id: 'mobile.calls_host_rec_stopped_title',
            defaultMessage: 'Recording has stopped. Processing...',
        }),
        formatMessage({
            id: 'mobile.calls_host_rec_stopped',
            defaultMessage: 'You can find the recording in this call\'s chat thread once it\'s finished processing.',
        }),
        [{
            text: formatMessage({
                id: 'mobile.calls_dismiss',
                defaultMessage: 'Dismiss',
            }),
        }],
    );
};
