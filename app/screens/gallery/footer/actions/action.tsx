// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, Pressable, PressableAndroidRippleConfig, PressableStateCallbackType, StyleProp, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@utils/theme';

type Props = {
    disabled: boolean;
    iconName: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

const pressedStyle = ({pressed}: PressableStateCallbackType) => {
    let opacity = 1;
    if (Platform.OS === 'ios' && pressed) {
        opacity = 0.5;
    }

    return [{opacity}];
};

const androidRippleConfig: PressableAndroidRippleConfig = {borderless: true, radius: 24, color: '#FFF'};

const Action = ({disabled, iconName, onPress, style}: Props) => {
    const pressableStyle = useCallback((pressed: PressableStateCallbackType) => ([
        pressedStyle(pressed),
        style,
    ]), [style]);

    return (
        <Pressable
            android_ripple={androidRippleConfig}
            disabled={disabled}
            hitSlop={24}
            onPress={onPress}
            style={pressableStyle}
        >
            <CompassIcon
                color={changeOpacity('#fff', disabled ? 0.4 : 1)}
                name={iconName}
                size={24}
            />
        </Pressable>
    );
};

export default Action;
