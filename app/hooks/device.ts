// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {RefObject, useEffect, useRef, useState} from 'react';
import {AppState, Keyboard, NativeModules, Platform, useWindowDimensions, View} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Device} from '@constants';

const {MattermostManaged} = NativeModules;
const isRunningInSplitView = MattermostManaged.isRunningInSplitView;

export function useSplitView() {
    const [isSplitView, setIsSplitView] = useState(false);
    const dimensions = useWindowDimensions();

    useEffect(() => {
        if (Device.IS_TABLET) {
            isRunningInSplitView().then((result: {isSplitView: boolean}) => {
                setIsSplitView(result.isSplitView);
            });
        }
    }, [dimensions]);

    return isSplitView;
}

export function useAppState() {
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        const listener = AppState.addEventListener('change', (nextState) => {
            setAppState(nextState);
        });

        return () => listener.remove();
    }, [appState]);

    return appState;
}

export function useIsTablet() {
    const isSplitView = useSplitView();
    return Device.IS_TABLET && !isSplitView;
}

export function useKeyboardHeightWithDuration(keyboardTracker?: React.RefObject<KeyboardTrackingViewRef>) {
    const [keyboardHeight, setKeyboardHeight] = useState({height: 0, duration: 0});
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();

    // This is a magic number. With tracking view, to properly get the final position, this had to be added.
    const KEYBOARD_TRACKINGVIEW_SEPARATION = 4;

    const updateValue = (height: number, duration: number) => {
        if (updateTimeout.current != null) {
            clearTimeout(updateTimeout.current);
            updateTimeout.current = null;
        }
        updateTimeout.current = setTimeout(() => {
            setKeyboardHeight({height, duration});
            updateTimeout.current = null;
        }, 200);
    };

    useEffect(() => {
        const show = Keyboard.addListener(Platform.select({ios: 'keyboardWillShow', default: 'keyboardDidShow'}), async (event) => {
            if (keyboardTracker?.current) {
                const props = await keyboardTracker.current.getNativeProps();
                if (props.keyboardHeight) {
                    updateValue((props.trackingViewHeight + props.keyboardHeight) - KEYBOARD_TRACKINGVIEW_SEPARATION, event.duration);
                } else {
                    updateValue((props.trackingViewHeight + insets.bottom) - KEYBOARD_TRACKINGVIEW_SEPARATION, event.duration);
                }
            } else {
                setKeyboardHeight({height: event.endCoordinates.height, duration: event.duration});
            }
        });

        const hide = Keyboard.addListener(Platform.select({ios: 'keyboardWillHide', default: 'keyboardDidHide'}), (event) => {
            if (updateTimeout.current != null) {
                clearTimeout(updateTimeout.current);
                updateTimeout.current = null;
            }
            setKeyboardHeight({height: 0, duration: event.duration});
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, [keyboardTracker && insets.bottom]);

    return keyboardHeight;
}

export function useKeyboardHeight(keyboardTracker?: React.RefObject<KeyboardTrackingViewRef>) {
    const {height} = useKeyboardHeightWithDuration(keyboardTracker);
    return height;
}

export function useModalPosition(viewRef: RefObject<View>, deps?: React.DependencyList) {
    const [modalPosition, setModalPosition] = useState(0);
    const isTablet = useIsTablet();
    const height = useKeyboardHeight();

    useEffect(() => {
        if (Platform.OS === 'ios' && isTablet) {
            viewRef.current?.measureInWindow((_, y) => {
                if (y !== modalPosition) {
                    setModalPosition(y);
                }
            });
        }
    }, [...(deps || []), isTablet, height]);

    return modalPosition;
}
