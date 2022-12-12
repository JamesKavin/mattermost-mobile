// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channel: Channel;
    onPress: (channel: Channel) => void;
    testID?: string;
    selectable?: boolean;
    selected?: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        titleContainer: {
            marginLeft: 16,
            flexDirection: 'column',
        },
        displayName: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        icon: {
            padding: 2,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        outerContainer: {
            paddingVertical: 9,
        },
        purpose: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
    };
});

export default function ChannelListRow({
    channel,
    onPress,
    testID,
    selectable = false,
    selected = false,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const handlePress = () => {
        onPress(channel);
    };

    const selectionIcon = useMemo(() => {
        if (!selectable) {
            return null;
        }

        const color = selected ? theme.buttonBg : theme.centerChannelColor;
        return (
            <View>
                <CompassIcon
                    name={selected ? 'check-circle' : 'circle-outline'}
                    size={28}
                    color={color}
                />
            </View>
        );
    }, [selectable, selected, theme]);

    let purposeComponent;
    if (channel.purpose) {
        purposeComponent = (
            <Text
                style={style.purpose}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {channel.purpose}
            </Text>
        );
    }

    const itemTestID = `${testID}.${channel.name}`;
    const channelDisplayNameTestID = `${itemTestID}.display_name`;
    let icon = 'globe';
    if (channel.delete_at) {
        icon = 'archive-outline';
    } else if (channel.shared) {
        icon = 'circle-multiple-outline';
    }

    return (
        <View style={style.outerContainer}>
            <TouchableOpacity
                onPress={handlePress}
            >
                <View
                    style={style.container}
                    testID={itemTestID}
                >
                    <CompassIcon
                        name={icon}
                        size={20}
                        style={style.icon}
                    />
                    <View style={style.titleContainer}>

                        <Text
                            style={style.displayName}
                            testID={channelDisplayNameTestID}
                        >
                            {channel.display_name}
                        </Text>
                        {purposeComponent}
                    </View>
                    {selectionIcon}
                </View>
            </TouchableOpacity>
        </View>
    );
}
