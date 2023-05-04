// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, Pressable, Platform} from 'react-native';

import {leaveCall, muteMyself, unmuteMyself} from '@calls/actions';
import {recordingAlert, recordingWillBePostedAlert, recordingErrorAlert} from '@calls/alerts';
import CallAvatar from '@calls/components/call_avatar';
import CallDuration from '@calls/components/call_duration';
import MessageBar from '@calls/components/message_bar';
import UnavailableIconWrapper from '@calls/components/unavailable_icon_wrapper';
import {usePermissionsChecker} from '@calls/hooks';
import {setCallQualityAlertDismissed, setMicPermissionsErrorDismissed} from '@calls/state';
import {makeCallsTheme} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import {Calls, Screens} from '@constants';
import {CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {allOrientations, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallsTheme, CurrentCall} from '@calls/types/calls';
import type UserModel from '@typings/database/models/servers/user';
import type {Options} from 'react-native-navigation';

type Props = {
    displayName: string;
    currentCall: CurrentCall | null;
    userModelsDict: Dictionary<UserModel>;
    teammateNameDisplay: string;
    micPermissionsGranted: boolean;
    threadScreen?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => {
    return {
        wrapper: {
            marginTop: 8,
            marginRight: 6,
            marginBottom: 8,
            marginLeft: 6,
            backgroundColor: theme.callsBg,
            borderRadius: 8,
        },
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.buttonColor, 0.08),
            borderRadius: 8,
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: changeOpacity(theme.buttonColor, 0.16),
            width: '100%',
            paddingTop: 8,
            paddingRight: 12,
            paddingBottom: 8,
            paddingLeft: 12,
            height: CURRENT_CALL_BAR_HEIGHT - 10,
        },
        pressable: {
            zIndex: 10,
        },
        profilePic: {
            marginTop: 4,
            marginRight: Platform.select({android: -8}),
            marginLeft: Platform.select({android: -8}),
        },
        userInfo: {
            flex: 1,
            paddingLeft: 6,
        },
        speakingUser: {
            color: theme.buttonColor,
            ...typography('Body', 200, 'SemiBold'),
        },
        speakingPostfix: {
            ...typography('Body', 200, 'Regular'),
        },
        channelAndTime: {
            color: changeOpacity(theme.buttonColor, 0.56),
            ...typography('Body', 75, 'Regular'),
        },
        separator: {
            color: changeOpacity(theme.buttonColor, 0.32),
            ...typography('Body', 75, 'Regular'),
        },
        buttonContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-evenly',
        },
        micIconContainer: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.onlineIndicator,
            borderRadius: 20,
        },
        micIcon: {
            color: changeOpacity(theme.buttonColor, 0.56),
        },
        muted: {
            backgroundColor: changeOpacity(theme.buttonColor, 0.08),
        },
        verticalLine: {
            height: 42,
            width: 1,
            backgroundColor: changeOpacity(theme.buttonColor, 0.16),
            marginLeft: 12,
            marginRight: 12,
        },
        hangupIconContainer: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.dndIndicator,
            borderRadius: 20,
        },
        hangupIcon: {
            color: theme.buttonColor,
        },
    };
});

const CurrentCallBar = ({
    displayName,
    currentCall,
    userModelsDict,
    teammateNameDisplay,
    micPermissionsGranted,
    threadScreen,
}: Props) => {
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    const intl = useIntl();
    const {formatMessage} = intl;
    usePermissionsChecker(micPermissionsGranted);

    const goToCallScreen = useCallback(async () => {
        const options: Options = {
            layout: {
                backgroundColor: '#000',
                componentBackgroundColor: '#000',
                orientation: allOrientations,
            },
            topBar: {
                background: {
                    color: '#000',
                },
                visible: Platform.OS === 'android',
            },
        };
        const title = formatMessage({id: 'mobile.calls_call_screen', defaultMessage: 'Call'});
        await dismissAllModalsAndPopToScreen(Screens.CALL, title, {fromThreadScreen: threadScreen}, options);
    }, [formatMessage, threadScreen]);

    const leaveCallHandler = useCallback(() => {
        leaveCall();
    }, []);

    const myParticipant = currentCall?.participants[currentCall.myUserId];

    // Since we can only see one user talking, it doesn't really matter who we show here (e.g., we can't
    // tell who is speaking louder).
    const talkingUsers = Object.keys(currentCall?.voiceOn || {});
    const speaker = talkingUsers.length > 0 ? talkingUsers[0] : '';
    let talkingMessage = (
        <Text style={style.speakingUser}>
            {formatMessage({
                id: 'mobile.calls_noone_talking',
                defaultMessage: 'No one is talking',
            })}
        </Text>);
    if (speaker) {
        talkingMessage = (
            <Text style={style.speakingUser}>
                {displayUsername(userModelsDict[speaker], intl.locale, teammateNameDisplay)}
                {' '}
                <Text style={style.speakingPostfix}>{
                    formatMessage({
                        id: 'mobile.calls_name_is_talking_postfix',
                        defaultMessage: 'is talking...',
                    })}
                </Text>
            </Text>);
    }

    const muteUnmute = () => {
        if (myParticipant?.muted) {
            unmuteMyself();
        } else {
            muteMyself();
        }
    };

    const micPermissionsError = !micPermissionsGranted && !currentCall?.micPermissionsErrorDismissed;

    // The user should receive an alert if all of the following conditions apply:
    // - Recording has started and recording has not ended.
    const isHost = Boolean(currentCall?.hostId === myParticipant?.id);
    if (currentCall?.recState?.start_at && !currentCall?.recState?.end_at) {
        recordingAlert(isHost, intl);
    }

    // The user should receive a recording finished alert if all of the following conditions apply:
    // - Is the host, recording has started, and recording has ended
    if (isHost && currentCall?.recState?.start_at && currentCall.recState.end_at) {
        recordingWillBePostedAlert(intl);
    }

    // The host should receive an alert in case of unexpected error.
    if (isHost && currentCall?.recState?.err) {
        recordingErrorAlert(intl);
    }

    return (
        <>
            <View style={style.wrapper}>
                <Pressable
                    style={style.container}
                    onPress={goToCallScreen}
                >
                    <View style={style.profilePic}>
                        <CallAvatar
                            userModel={userModelsDict[speaker || '']}
                            volume={speaker ? 0.5 : 0}
                            serverUrl={currentCall?.serverUrl || ''}
                            size={32}
                        />
                    </View>
                    <View style={style.userInfo}>
                        {talkingMessage}
                        <Text style={style.channelAndTime}>
                            {`~${displayName}`}
                            <Text style={style.separator}>{'  •  '}</Text>
                            <CallDuration
                                style={style.channelAndTime}
                                value={currentCall?.startTime || Date.now()}
                                updateIntervalInSeconds={1}
                            />
                        </Text>
                    </View>
                    <View style={style.buttonContainer}>
                        <Pressable
                            onPress={muteUnmute}
                            style={[style.pressable, style.micIconContainer, myParticipant?.muted && style.muted]}
                            disabled={!micPermissionsGranted}
                        >
                            <UnavailableIconWrapper
                                name={myParticipant?.muted ? 'microphone-off' : 'microphone'}
                                size={24}
                                unavailable={!micPermissionsGranted}
                                style={style.micIcon}
                            />
                        </Pressable>
                        <View style={style.verticalLine}/>
                        <Pressable
                            onPress={leaveCallHandler}
                            style={[style.pressable, style.hangupIconContainer]}
                        >
                            <CompassIcon
                                name='phone-hangup'
                                size={24}
                                style={style.hangupIcon}
                            />
                        </Pressable>
                    </View>
                </Pressable>
            </View>
            {micPermissionsError &&
                <MessageBar
                    type={Calls.MessageBarType.Microphone}
                    onPress={setMicPermissionsErrorDismissed}
                />
            }
            {currentCall?.callQualityAlert &&
                <MessageBar
                    type={Calls.MessageBarType.CallQuality}
                    onPress={setCallQualityAlertDismissed}
                />
            }
        </>
    );
};

export default CurrentCallBar;
