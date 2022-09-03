// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useCallback, useEffect, useRef} from 'react';
import {DeviceEventEmitter, Keyboard, StyleSheet, useWindowDimensions, View} from 'react-native';
import {State, TapGestureHandler} from 'react-native-gesture-handler';
import {Navigation as RNN} from 'react-native-navigation';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import RNBottomSheet from 'reanimated-bottom-sheet';

import {Events} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {dismissModal} from '@screens/navigation';
import {hapticFeedback} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Indicator from './indicator';

type SlideUpPanelProps = {
    closeButtonId?: string;
    componentId: string;
    initialSnapIndex?: number;
    renderContent: () => ReactNode;
    snapPoints?: Array<string | number>;
    testID?: string;
}

export const PADDING_TOP_MOBILE = 20;

const BottomSheet = ({closeButtonId, componentId, initialSnapIndex = 0, renderContent, snapPoints = ['90%', '50%', 50], testID}: SlideUpPanelProps) => {
    const sheetRef = useRef<RNBottomSheet>(null);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const theme = useTheme();
    const firstRun = useRef(isTablet);
    const lastSnap = snapPoints.length - 1;
    const backdropOpacity = useSharedValue(0);

    const close = useCallback(() => {
        if (firstRun.current) {
            dismissModal({componentId});
        }
    }, [componentId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.CLOSE_BOTTOM_SHEET, () => {
            if (sheetRef.current) {
                sheetRef.current.snapTo(lastSnap);
            } else {
                close();
            }
        });

        return () => listener.remove();
    }, [close]);

    const handleClose = useCallback(() => {
        if (sheetRef.current) {
            sheetRef.current.snapTo(1);
        } else {
            close();
        }
    }, []);

    const handleCloseEnd = useCallback(() => {
        if (firstRun.current) {
            backdropOpacity.value = 0;
            setTimeout(close, 250);
        }
    }, []);

    const handleOpenStart = useCallback(() => {
        backdropOpacity.value = 1;
    }, []);

    useAndroidHardwareBackHandler(componentId, handleClose);

    useEffect(() => {
        hapticFeedback();
        Keyboard.dismiss();
        sheetRef.current?.snapTo(initialSnapIndex);
        backdropOpacity.value = 1;
        const t = setTimeout(() => {
            firstRun.current = true;
        }, 100);

        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const navigationEvents = RNN.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                close();
            }
        });

        return () => navigationEvents.remove();
    }, [close]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: withTiming(backdropOpacity.value, {duration: 250, easing: Easing.inOut(Easing.linear)}),
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    }));

    const renderBackdrop = () => {
        return (
            <TapGestureHandler
                shouldCancelWhenOutside={true}
                maxDist={10}
                onHandlerStateChange={(event) => {
                    if (event.nativeEvent.state === State.END && event.nativeEvent.oldState === State.ACTIVE) {
                        sheetRef.current?.snapTo(lastSnap);
                    }
                }}
                testID={`${testID}.backdrop`}
            >
                <Animated.View
                    style={[StyleSheet.absoluteFill, backdropStyle]}
                />
            </TapGestureHandler>
        );
    };

    const renderContainerContent = () => (
        <View
            style={{
                backgroundColor: theme.centerChannelBg,
                opacity: 1,
                paddingHorizontal: 20,
                paddingTop: isTablet ? 0 : PADDING_TOP_MOBILE,
                height: '100%',
                width: isTablet ? '100%' : Math.min(dimensions.width, 450),
                alignSelf: 'center',
            }}
            testID={`${testID}.screen`}
        >
            {renderContent()}
        </View>
    );

    if (isTablet) {
        const styles = getStyleSheet(theme);
        return (
            <>
                <View style={styles.separator}/>
                {renderContainerContent()}
            </>
        );
    }

    return (
        <>
            <RNBottomSheet
                ref={sheetRef}
                snapPoints={snapPoints}
                borderRadius={10}
                initialSnap={snapPoints.length - 1}
                renderContent={renderContainerContent}
                onCloseEnd={handleCloseEnd}
                onOpenStart={handleOpenStart}
                enabledBottomInitialAnimation={false}
                renderHeader={Indicator}
                enabledContentTapInteraction={false}
            />
            {renderBackdrop()}
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        separator: {
            height: 1,
            borderTopWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
    };
});

export default BottomSheet;
