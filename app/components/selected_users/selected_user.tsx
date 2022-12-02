// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

type Props = {

    /*
     * How to display the names of users.
     */
    teammateNameDisplay: string;

    /*
     * The user that this component represents.
     */
    user: UserProfile;

    /*
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /*
     * The test ID.
     */
    testID?: string;
}

export const USER_CHIP_HEIGHT = 32;
export const USER_CHIP_BOTTOM_MARGIN = 8;
const FADE_DURATION = 100;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderRadius: 16,
            height: USER_CHIP_HEIGHT,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: USER_CHIP_BOTTOM_MARGIN,
            marginRight: 8,
            paddingHorizontal: 7,
        },
        remove: {
            justifyContent: 'center',
            marginLeft: 7,
        },
        profileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 8,
            color: theme.centerChannelColor,
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

export default function SelectedUser({
    teammateNameDisplay,
    user,
    onRemove,
    testID,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const intl = useIntl();

    const onPress = useCallback(() => {
        onRemove(user.id);
    }, [onRemove, user.id]);

    const userItemTestID = `${testID}.${user.id}`;
    return (
        <Animated.View
            entering={FadeIn.duration(FADE_DURATION)}
            exiting={FadeOut.duration(FADE_DURATION)}
            style={style.container}
            testID={`${testID}.${user.id}`}
        >
            <View style={style.profileContainer}>
                <ProfilePicture
                    author={user}
                    size={20}
                    iconSize={20}
                    testID={`${userItemTestID}.profile_picture`}
                />
            </View>
            <Text
                style={style.text}
                testID={`${testID}.${user.id}.display_name`}
            >
                {displayUsername(user, intl.locale, teammateNameDisplay)}
            </Text>
            <TouchableOpacity
                style={style.remove}
                onPress={onPress}
                testID={`${testID}.${user.id}.remove.button`}
            >
                <CompassIcon
                    name='close-circle'
                    size={18}
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}
