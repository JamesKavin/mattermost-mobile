// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelInfoEnableCalls from '@calls/components/channel_info_enable_calls';
import ChannelActions from '@components/channel_actions';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ChannelInfoAppBindings from './app_bindings';
import DestructiveOptions from './destructive_options';
import Extra from './extra';
import Options from './options';
import Title from './title';

type Props = {
    channelId: string;
    closeButtonId: string;
    componentId: string;
    type?: ChannelType;
    canEnableDisableCalls: boolean;
    isCallsEnabledInChannel: boolean;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    content: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    flex: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginVertical: 8,
    },
}));

const ChannelInfo = ({
    channelId,
    closeButtonId,
    componentId,
    type,
    canEnableDisableCalls,
    isCallsEnabledInChannel,
}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    // NOTE: isCallsEnabledInChannel will be true/false (not undefined) based on explicit state + the DefaultEnabled system setting
    //   which comes from observeIsCallsEnabledInChannel
    const callsAvailable = isCallsEnabledInChannel;

    const onPressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, onPressed, []);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            testID='channel_info.screen'
        >
            <ScrollView
                bounces={true}
                alwaysBounceVertical={false}
                contentContainerStyle={styles.content}
                testID='channel_info.scroll_view'
            >
                <Title
                    channelId={channelId}
                    type={type}
                />
                <ChannelActions
                    channelId={channelId}
                    inModal={true}
                    dismissChannelInfo={onPressed}
                    callsEnabled={callsAvailable}
                    testID='channel_info.channel_actions'
                />
                <Extra channelId={channelId}/>
                <View style={styles.separator}/>
                <Options
                    channelId={channelId}
                    type={type}
                    callsEnabled={callsAvailable}
                />
                <View style={styles.separator}/>
                {canEnableDisableCalls &&
                    <>
                        <ChannelInfoEnableCalls
                            channelId={channelId}
                            enabled={isCallsEnabledInChannel}
                        />
                        <View style={styles.separator}/>
                    </>
                }
                <ChannelInfoAppBindings
                    channelId={channelId}
                    serverUrl={serverUrl}
                    dismissChannelInfo={onPressed}
                />
                <DestructiveOptions
                    channelId={channelId}
                    componentId={componentId}
                    type={type}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default ChannelInfo;
