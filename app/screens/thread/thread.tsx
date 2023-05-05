// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {uniqueId} from 'lodash';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import FloatingCallContainer from '@calls/components/floating_call_container';
import {RoundedHeaderCalls} from '@calls/components/join_call_banner/rounded_header_calls';
import FreezeScreen from '@components/freeze_screen';
import PostDraft from '@components/post_draft';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {useKeyboardTrackingPaused} from '@hooks/keyboard_tracking';
import {popTopScreen, setButtons} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

type ThreadProps = {
    componentId: AvailableScreens;
    isCRTEnabled: boolean;
    isCallInCurrentChannel: boolean;
    isInACall: boolean;
    isInCurrentChannelCall: boolean;
    rootId: string;
    rootPost?: PostModel;
};

const edges: Edge[] = ['left', 'right'];
const trackKeyboardForScreens = [Screens.THREAD];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Thread = ({
    componentId,
    isCRTEnabled,
    rootId,
    rootPost,
    isCallInCurrentChannel,
    isInACall,
    isInCurrentChannelCall,
}: ThreadProps) => {
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    const close = () => {
        popTopScreen(componentId);
    };

    useKeyboardTrackingPaused(postDraftRef, rootId, trackKeyboardForScreens);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        if (isCRTEnabled && rootId) {
            const id = `${componentId}-${rootId}-${uniqueId()}`;
            const name = Screens.THREAD_FOLLOW_BUTTON;
            setButtons(componentId, {rightButtons: [{
                id,
                component: {
                    name,
                    passProps: {
                        threadId: rootId,
                    },
                },
            }]});
        } else {
            setButtons(componentId, {rightButtons: []});
        }
    }, [componentId, rootId, isCRTEnabled]);

    useEffect(() => {
        return () => {
            EphemeralStore.setCurrentThreadId('');
            setButtons(componentId, {rightButtons: []});
        };
    }, []);

    useDidUpdate(() => {
        if (!rootPost) {
            close();
        }
    }, [componentId, rootPost]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showJoinCallBanner = isCallInCurrentChannel && !isInCurrentChannelCall;
    const renderCallsComponents = showJoinCallBanner || isInACall;

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
                testID='thread.screen'
                onLayout={onLayout}
            >
                <RoundedHeaderContext/>
                {showJoinCallBanner && <RoundedHeaderCalls threadScreen={true}/>}
                {Boolean(rootPost) &&
                <>
                    <View style={styles.flex}>
                        <ThreadPostList
                            nativeID={rootId}
                            rootPost={rootPost!}
                        />
                    </View>
                    <PostDraft
                        channelId={rootPost!.channelId}
                        scrollViewNativeID={rootId}
                        accessoriesContainerID={THREAD_ACCESSORIES_CONTAINER_NATIVE_ID}
                        rootId={rootId}
                        keyboardTracker={postDraftRef}
                        testID='thread.post_draft'
                        containerHeight={containerHeight}
                        isChannelScreen={false}
                    />
                </>
                }
                {renderCallsComponents &&
                    <FloatingCallContainer
                        channelId={rootPost!.channelId}
                        showJoinCallBanner={showJoinCallBanner}
                        isInACall={isInACall}
                        threadScreen={true}
                    />
                }
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Thread;
