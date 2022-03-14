// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Text, TouchableOpacity, useWindowDimensions, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ImageSource} from 'react-native-vector-icons/Icon';

type HeaderDisplayNameProps = {
    commentCount: number;
    displayName?: string;
    isAutomation: boolean;
    rootPostAuthor?: string;
    shouldRenderReplyButton?: boolean;
    theme: Theme;
    userId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        displayName: {
            color: theme.centerChannelColor,
            flexGrow: 1,
            ...typography('Body', 200, 'SemiBold'),
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
        },
        displayNameContainerBotReplyWidth: {
            maxWidth: '50%',
        },
        displayNameContainerLandscape: {
            maxWidth: '80%',
        },
        displayNameContainerLandscapeBotReplyWidth: {
            maxWidth: '70%',
        },

    };
});

const HeaderDisplayName = ({
    commentCount, displayName, isAutomation, rootPostAuthor, shouldRenderReplyButton, theme, userId,
}: HeaderDisplayNameProps) => {
    const closeButton = useRef<ImageSource>();
    const dimensions = useWindowDimensions();
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const onPress = useCallback(preventDoubleTap(() => {
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {userId};

        if (!closeButton.current) {
            closeButton.current = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-user-profile',
                    icon: closeButton.current,
                    testID: 'close.user_profile.button',
                }],
            },
        };

        Keyboard.dismiss();
        showModal(screen, title, passProps, options);
    }), []);

    const calcNameWidth = () => {
        const isLandscape = dimensions.width > dimensions.height;

        const showReply = shouldRenderReplyButton || (!rootPostAuthor && commentCount > 0);
        const reduceWidth = showReply && isAutomation;

        if (reduceWidth && isLandscape) {
            return style.displayNameContainerLandscapeBotReplyWidth;
        } else if (isLandscape) {
            return style.displayNameContainerLandscape;
        } else if (reduceWidth) {
            return style.displayNameContainerBotReplyWidth;
        }
        return undefined;
    };

    const displayNameWidth = calcNameWidth();
    const displayNameStyle = [style.displayNameContainer, displayNameWidth];

    if (isAutomation) {
        return (
            <View style={displayNameStyle}>
                <Text
                    style={style.displayName}
                    ellipsizeMode={'tail'}
                    numberOfLines={1}
                    testID='post_header.display_name'
                >
                    {displayName}
                </Text>
            </View>
        );
    } else if (displayName) {
        return (
            <View style={displayNameStyle}>
                <TouchableOpacity onPress={onPress}>
                    <Text
                        style={style.displayName}
                        ellipsizeMode={'tail'}
                        numberOfLines={1}
                        testID='post_header.display_name'
                    >
                        {displayName}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={style.displayNameContainer}>
            <FormattedText
                id='channel_loader.someone'
                defaultMessage='Someone'
                style={style.displayName}
                testID='post_header.display_name'
            />
        </View>
    );
};

export default HeaderDisplayName;
