// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    displayName?: string;
    user?: UserModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
    },
    displayName: {
        flexDirection: 'row',
    },
    position: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
    tagContainer: {
        marginLeft: 12,
    },
    tag: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    titleContainer: {
        flex: 1,
        marginLeft: 16,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 700, 'SemiBold'),
        flexShrink: 1,
    },
}));

const DirectMessage = ({displayName, user}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const directMessageUserTestId = `channel_info.title.direct_message.${user?.id}`;

    return (
        <View
            style={styles.container}
            testID={directMessageUserTestId}
        >
            <ProfilePicture
                author={user}
                size={64}
                iconSize={64}
                showStatus={true}
                statusSize={24}
                testID={`${directMessageUserTestId}.profile_picture`}
            />
            <View style={styles.titleContainer}>
                <View style={styles.displayName}>
                    <Text
                        numberOfLines={1}
                        style={styles.title}
                        testID={`${directMessageUserTestId}.display_name`}
                    >
                        {displayName}
                    </Text>
                    {user?.isGuest &&
                    <GuestTag
                        textStyle={styles.tag}
                        style={styles.tagContainer}
                        testID={`${directMessageUserTestId}.guest.tag`}
                    />
                    }
                    {user?.isBot &&
                    <BotTag
                        textStyle={styles.tag}
                        style={styles.tagContainer}
                        testID={`${directMessageUserTestId}.bot.tag`}
                    />
                    }
                </View>
                {Boolean(user?.position) &&
                <Text
                    style={styles.position}
                    testID={`${directMessageUserTestId}.position`}
                >
                    {user?.position}
                </Text>
                }
                {Boolean(user?.isBot && user.props?.bot_description) &&
                <Text
                    style={styles.position}
                    testID={`${directMessageUserTestId}.bot_description`}
                >
                    {user?.props?.bot_description}
                </Text>
                }
            </View>
        </View>
    );
};

export default DirectMessage;
