// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';

import ChannelInfoStartButton from '@calls/components/channel_info_start';
import CopyChannelLinkBox from '@components/channel_actions/copy_channel_link_box';
import FavoriteBox from '@components/channel_actions/favorite_box';
import MutedBox from '@components/channel_actions/mute_box';
import SetHeaderBox from '@components/channel_actions/set_header_box';
import {useServerUrl} from '@context/server';
import {dismissBottomSheet} from '@screens/navigation';
import {isTypeDMorGM} from '@utils/channel';

// import AddPeopleBox from '@components/channel_actions/add_people_box';

type Props = {
    channelId: string;
    channelType?: ChannelType;
    inModal?: boolean;
    dismissChannelInfo: () => void;
    callsEnabled: boolean;
    testID?: string;
}

export const CHANNEL_ACTIONS_OPTIONS_HEIGHT = 62;

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        height: CHANNEL_ACTIONS_OPTIONS_HEIGHT,
    },
    separator: {
        width: 8,
    },
});

const ChannelActions = ({channelId, channelType, inModal = false, dismissChannelInfo, callsEnabled, testID}: Props) => {
    const serverUrl = useServerUrl();

    const onCopyLinkAnimationEnd = useCallback(() => {
        if (!inModal) {
            requestAnimationFrame(async () => {
                await dismissBottomSheet();
            });
        }
    }, [inModal]);

    const isDM = isTypeDMorGM(channelType);

    return (
        <View style={styles.wrapper}>
            <FavoriteBox
                channelId={channelId}
                showSnackBar={!inModal}
                testID={testID}
            />
            <View style={styles.separator}/>
            <MutedBox
                channelId={channelId}
                showSnackBar={!inModal}
                testID={testID}
            />
            <View style={styles.separator}/>
            {isDM &&
                <SetHeaderBox
                    channelId={channelId}
                    inModal={inModal}
                    testID={`${testID}.set_header.action`}
                />
            }
            {/* Add back in after MM-47655 is resolved. https://mattermost.atlassian.net/browse/MM-47655
            {!isDM &&
                <AddPeopleBox
                    channelId={channelId}
                    inModal={inModal}
                    testID={`${testID}.add_people.action`}
                />
            }
            */}
            {!isDM && !callsEnabled &&
                <>
                    <View style={styles.separator}/>
                    <CopyChannelLinkBox
                        channelId={channelId}
                        onAnimationEnd={onCopyLinkAnimationEnd}
                        testID={`${testID}.copy_channel_link.action`}
                    />
                </>
            }
            {callsEnabled &&
                <>
                    <View style={styles.separator}/>
                    <ChannelInfoStartButton
                        serverUrl={serverUrl}
                        channelId={channelId}
                        dismissChannelInfo={dismissChannelInfo}
                    />
                </>
            }
        </View>
    );
};

export default ChannelActions;
