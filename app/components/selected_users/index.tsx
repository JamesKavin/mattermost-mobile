// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {LayoutChangeEvent, Platform, ScrollView, useWindowDimensions, View} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Toast from '@components/toast';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet, useKeyboardHeightWithDuration} from '@hooks/device';
import Button from '@screens/bottom_sheet/button';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SelectedUser, {USER_CHIP_BOTTOM_MARGIN, USER_CHIP_HEIGHT} from './selected_user';

type Props = {

    /**
     * Name of the button Icon
     */
    buttonIcon: string;

    /*
     * Text displayed on the action button
     */
    buttonText: string;

    /**
     * the height of the parent container
     */
    containerHeight?: number;

    /**
     * the Y position of the first view in the parent container
     */
    modalPosition?: number;

    /**
     * A handler function that will select or deselect a user when clicked on.
     */
    onPress: (selectedId?: {[id: string]: boolean}) => void;

    /**
     * A handler function that will deselect a user when clicked on.
     */
    onRemove: (id: string) => void;

    /**
     * An object mapping user ids to a falsey value indicating whether or not they have been selected.
     */
    selectedIds: {[id: string]: UserProfile};

    /**
     * callback to set the value of showToast
     */
    setShowToast: (show: boolean) => void;

    /**
     * show the toast
     */
    showToast: boolean;

    /**
    * How to display the names of users.
    */
    teammateNameDisplay: string;

    /**
     * test ID
     */
    testID?: string;

    /**
     * toast Icon
     */
    toastIcon?: string;

    /**
     * toast Message
     */
    toastMessage: string;
}

const BUTTON_HEIGHT = 48;
const CHIP_HEIGHT_WITH_MARGIN = USER_CHIP_HEIGHT + USER_CHIP_BOTTOM_MARGIN;
const EXPOSED_CHIP_HEIGHT = 0.33 * USER_CHIP_HEIGHT;
const MAX_CHIP_ROWS = 2;
const SCROLL_PADDING_TOP = 20;
const PANEL_MAX_HEIGHT = SCROLL_PADDING_TOP + (CHIP_HEIGHT_WITH_MARGIN * MAX_CHIP_ROWS) + EXPOSED_CHIP_HEIGHT;
const TABLET_MARGIN_BOTTOM = 20;
const TOAST_BOTTOM_MARGIN = 24;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            maxHeight: PANEL_MAX_HEIGHT + BUTTON_HEIGHT,
            overflow: 'hidden',
            paddingHorizontal: 20,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 8,
            },
            shadowOpacity: 0.16,
            shadowRadius: 24,
        },
        toast: {
            backgroundColor: theme.centerChannelColor,
        },
        users: {
            paddingTop: SCROLL_PADDING_TOP,
            paddingBottom: 12,
            flexDirection: 'row',
            flexGrow: 1,
            flexWrap: 'wrap',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 12,
            marginRight: 5,
            marginTop: 10,
            marginBottom: 2,
        },
    };
});

export default function SelectedUsers({
    buttonIcon, buttonText, containerHeight = 0,
    modalPosition = 0, onPress, onRemove,
    selectedIds, setShowToast, showToast = false,
    teammateNameDisplay, testID, toastIcon, toastMessage,
}: Props) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const isTablet = useIsTablet();
    const keyboard = useKeyboardHeightWithDuration();
    const insets = useSafeAreaInsets();
    const dimensions = useWindowDimensions();

    const panelHeight = useSharedValue(0);
    const [isVisible, setIsVisible] = useState(false);
    const numberSelectedIds = Object.keys(selectedIds).length;
    const bottomSpace = (dimensions.height - containerHeight - modalPosition);

    const users = useMemo(() => {
        const u = [];
        for (const id of Object.keys(selectedIds)) {
            if (!selectedIds[id]) {
                continue;
            }

            u.push(
                <SelectedUser
                    key={id}
                    user={selectedIds[id]}
                    teammateNameDisplay={teammateNameDisplay}
                    onRemove={onRemove}
                    testID={`${testID}.selected_user`}
                />,
            );
        }
        return u;
    }, [selectedIds, teammateNameDisplay, onRemove]);

    const totalPanelHeight = useDerivedValue(() => (
        isVisible ? panelHeight.value + BUTTON_HEIGHT : 0
    ), [isVisible, isTablet]);

    const marginBottom = useMemo(() => {
        let margin = keyboard.height && Platform.OS === 'ios' ? keyboard.height - insets.bottom : 0;
        if (isTablet) {
            margin = keyboard.height ? (keyboard.height - bottomSpace - insets.bottom) : 0;
        }
        return margin;
    }, [keyboard, isTablet, insets.bottom, bottomSpace]);

    const paddingBottom = useMemo(() => {
        if (Platform.OS === 'android') {
            return TABLET_MARGIN_BOTTOM + insets.bottom;
        }

        if (!isVisible) {
            return 0;
        }

        if (isTablet) {
            return TABLET_MARGIN_BOTTOM + insets.bottom;
        }

        if (!keyboard.height) {
            return insets.bottom;
        }

        return TABLET_MARGIN_BOTTOM + insets.bottom;
    }, [isTablet, isVisible, insets.bottom, keyboard.height]);

    const handlePress = useCallback(() => {
        onPress();
    }, [onPress]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        panelHeight.value = Math.min(PANEL_MAX_HEIGHT, e.nativeEvent.layout.height);
    }, []);

    const androidMaxHeight = Platform.select({
        android: {
            maxHeight: isVisible ? undefined : 0,
        },
    });

    const animatedContainerStyle = useAnimatedStyle(() => ({
        marginBottom: withTiming(marginBottom, {duration: keyboard.duration}),
        paddingBottom: withTiming(paddingBottom, {duration: keyboard.duration}),
        backgroundColor: isVisible ? theme.centerChannelBg : 'transparent',
        ...androidMaxHeight,
    }), [marginBottom, paddingBottom, keyboard.duration, isVisible, theme.centerChannelBg]);

    const animatedToastStyle = useAnimatedStyle(() => {
        return {
            bottom: TOAST_BOTTOM_MARGIN + totalPanelHeight.value,
            opacity: withTiming(showToast ? 1 : 0, {duration: 250}),
            position: 'absolute',
        };
    }, [showToast, keyboard]);

    const animatedViewStyle = useAnimatedStyle(() => ({
        height: withTiming(totalPanelHeight.value, {duration: 250}),
        borderWidth: isVisible ? 1 : 0,
        maxHeight: isVisible ? PANEL_MAX_HEIGHT + BUTTON_HEIGHT : 0,
    }), [totalPanelHeight.value, isVisible]);

    const animatedButtonStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isVisible ? 1 : 0, {duration: isVisible ? 500 : 100}),
    }), [isVisible]);

    useEffect(() => {
        setIsVisible(numberSelectedIds > 0);
    }, [numberSelectedIds > 0]);

    // This effect hides the toast after 4 seconds
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showToast) {
            timer = setTimeout(() => {
                setShowToast(false);
            }, 4000);
        }

        return () => clearTimeout(timer);
    }, [showToast]);

    return (
        <Animated.View style={animatedContainerStyle}>
            {showToast &&
            <Toast
                animatedStyle={animatedToastStyle}
                iconName={toastIcon}
                style={style.toast}
                message={toastMessage}
            />
            }
            <Animated.View style={[style.container, animatedViewStyle]}>
                <ScrollView>
                    <View
                        style={style.users}
                        onLayout={onLayout}
                    >
                        {users}
                    </View>
                </ScrollView>
                <Animated.View style={animatedButtonStyle}>
                    <Button
                        onPress={handlePress}
                        icon={buttonIcon}
                        text={buttonText}
                        disabled={numberSelectedIds > General.MAX_USERS_IN_GM}
                        testID={`${testID}.start.button`}
                    />
                </Animated.View>
            </Animated.View>
        </Animated.View>
    );
}

