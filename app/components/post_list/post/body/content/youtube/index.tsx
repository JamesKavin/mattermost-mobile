// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, StyleSheet, TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {emptyFunction} from '@utils/general';
import {calculateDimensions, getViewPortWidth} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getYouTubeVideoId, tryOpenURL} from '@utils/url';

import YouTubeLogo from './youtube.svg';

type YouTubeProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    metadata: PostMetadata;
}

const MAX_YOUTUBE_IMAGE_HEIGHT = 280;
const MAX_YOUTUBE_IMAGE_WIDTH = 500;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        borderRadius: 4,
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 4,
        justifyContent: 'center',
    },
    playButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: changeOpacity('#000', 0.24),
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        borderWidth: 1,
        elevation: 3,
        shadowColor: changeOpacity('#000', 0.08),
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 1,
        shadowRadius: 3,
    },
}));

const YouTube = ({isReplyPost, layoutWidth, metadata}: YouTubeProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const link = metadata.embeds![0].url;
    const videoId = getYouTubeVideoId(link);
    const dimensions = calculateDimensions(
        MAX_YOUTUBE_IMAGE_HEIGHT,
        MAX_YOUTUBE_IMAGE_WIDTH,
        layoutWidth || (getViewPortWidth(isReplyPost, isTablet) - 6),
    );

    const playYouTubeVideo = useCallback(() => {
        const onError = () => {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                intl.formatMessage({
                    id: 'mobile.link.error.text',
                    defaultMessage: 'Unable to open the link.',
                }),
            );
        };

        tryOpenURL(link, onError);
    }, [link, intl.locale]);

    let imgUrl;
    if (metadata.images) {
        imgUrl = Object.keys(metadata.images)[0];
    }

    if (!imgUrl) {
        // Fallback to default YouTube thumbnail if available
        imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return (
        <TouchableOpacity
            style={[styles.imageContainer, {height: dimensions.height, width: dimensions.width}]}
            onPress={playYouTubeVideo}
        >
            <FastImage
                onError={emptyFunction}
                resizeMode='cover'
                style={[styles.image, dimensions]}
                source={{uri: imgUrl}}
            />
            <View style={styles.playContainer}>
                <View style={styles.playButton}>
                    <YouTubeLogo/>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default React.memo(YouTube);
