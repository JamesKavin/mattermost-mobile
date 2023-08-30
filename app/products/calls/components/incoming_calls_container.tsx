// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CallNotification from '@calls/components/call_notification';
import {useCurrentCall, useGlobalCallsState, useIncomingCalls} from '@calls/state';
import {
    CALL_ERROR_BAR_HEIGHT,
    CURRENT_CALL_BAR_HEIGHT,
    DEFAULT_HEADER_HEIGHT,
    JOIN_CALL_BAR_HEIGHT,
} from '@constants/view';

const topBarHeight = DEFAULT_HEADER_HEIGHT;

const style = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        width: '100%',
        marginTop: 8,
        gap: 8,
    },
});

type Props = {
    channelId: string;
    showingJoinCallBanner: boolean;
    showingCurrentCallBanner: boolean;
    threadScreen?: boolean;
}

export const IncomingCallsContainer = ({
    channelId,
    showingJoinCallBanner,
    showingCurrentCallBanner,
    threadScreen,
}: Props) => {
    const incomingCalls = useIncomingCalls().incomingCalls;
    const insets = useSafeAreaInsets();
    const micPermissionsGranted = useGlobalCallsState().micPermissionsGranted;
    const currentCall = useCurrentCall();

    // If we're in the channel for the incoming call, don't show the incoming call banner.
    const calls = incomingCalls.filter((ic) => ic.channelID !== channelId);
    if (calls.length === 0) {
        return null;
    }

    const micPermissionsError = !micPermissionsGranted && (currentCall ? !currentCall.micPermissionsErrorDismissed : false);
    const qualityAlert = showingCurrentCallBanner && (currentCall ? currentCall.callQualityAlert && currentCall.callQualityAlertDismissed === 0 : false);
    const top = insets.top + (threadScreen ? 0 : topBarHeight) +
        (showingJoinCallBanner ? JOIN_CALL_BAR_HEIGHT : 0) +
        (showingCurrentCallBanner ? CURRENT_CALL_BAR_HEIGHT - 2 : 0) +
        (micPermissionsError ? CALL_ERROR_BAR_HEIGHT + 8 : 0) +
        (qualityAlert ? CALL_ERROR_BAR_HEIGHT + 8 : 0);
    const wrapperTop = {top};

    return (
        <View style={[style.wrapper, wrapperTop]}>
            {calls.map((ic) => (
                <CallNotification
                    key={ic.callID}
                    incomingCall={ic}
                />
            ))}
        </View>
    );
};
