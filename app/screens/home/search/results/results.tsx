// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {TabTypes, TabType} from '@utils/search';

import FileResults from './file_results';
import PostResults from './post_results';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const duration = 250;

const getStyles = (width: number) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            width: width * 2,
        },
        result: {
            flex: 1,
            width,
        },
        loading: {
            justifyContent: 'center',
            flex: 1,
            width,
        },
    });
};

type Props = {
    appsEnabled: boolean;
    canDownloadFiles: boolean;
    currentTimezone: string;
    customEmojiNames: string[];
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    isTimezoneEnabled: boolean;
    loading: boolean;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
}

const Results = ({
    appsEnabled,
    canDownloadFiles,
    currentTimezone,
    customEmojiNames,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    loading,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    const {width} = useWindowDimensions();
    const theme = useTheme();
    const styles = useMemo(() => getStyles(width), [width]);

    const transform = useAnimatedStyle(() => {
        const translateX = selectedTab === TabTypes.MESSAGES ? 0 : -width;
        return {
            transform: [
                {translateX: withTiming(translateX, {duration})},
            ],
        };

        // Do not transform if loading new data. Causes a case where post
        // results show up in Files results when the team is changed
    }, [selectedTab, width, !loading]);

    const paddingTop = useMemo(() => (
        {paddingTop: scrollPaddingTop, flexGrow: 1}
    ), [scrollPaddingTop]);

    return (
        <>
            {loading &&
                <Loading
                    color={theme.buttonBg}
                    size='large'
                    containerStyle={[styles.loading, paddingTop]}
                />
            }
            {!loading &&
            <Animated.View style={[styles.container, transform]}>
                <View style={styles.result} >
                    <PostResults
                        appsEnabled={appsEnabled}
                        currentTimezone={currentTimezone}
                        customEmojiNames={customEmojiNames}
                        isTimezoneEnabled={isTimezoneEnabled}
                        posts={posts}
                        paddingTop={paddingTop}
                        searchValue={searchValue}
                    />
                </View>
                <View style={styles.result} >
                    <FileResults
                        canDownloadFiles={canDownloadFiles}
                        fileChannels={fileChannels}
                        fileInfos={fileInfos}
                        paddingTop={paddingTop}
                        publicLinkEnabled={publicLinkEnabled}
                        searchValue={searchValue}
                    />
                </View>
            </Animated.View>
            }
        </>
    );
};

export default Results;
