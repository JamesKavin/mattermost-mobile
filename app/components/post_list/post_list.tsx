// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlatList} from '@stream-io/flat-list-mvcp';
import React, {ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import {fetchPosts, fetchPostThread} from '@actions/remote/post';
import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import ThreadOverview from '@components/post_list/thread_overview';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getDateForDateLine, preparePostList} from '@utils/post_list';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG, VIEWABILITY_CONFIG} from './config';
import MoreMessages from './more_messages';
import PostListRefreshControl from './refresh_control';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged, ViewableItemsChangedListenerEvent} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    appsEnabled: boolean;
    channelId: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    currentTimezone: string | null;
    currentUserId: string;
    currentUsername: string;
    customEmojiNames: string[];
    disablePullToRefresh?: boolean;
    highlightedId?: PostModel['id'];
    highlightPinnedOrSaved?: boolean;
    isCRTEnabled?: boolean;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    location: string;
    nativeID: string;
    onEndReached?: () => void;
    posts: PostModel[];
    rootId?: string;
    shouldRenderReplyButton?: boolean;
    shouldShowJoinLeaveMessages: boolean;
    showMoreMessages?: boolean;
    showNewMessageLine?: boolean;
    footer?: ReactElement;
    header?: ReactElement;
    testID: string;
    currentCallBarVisible?: boolean;
    joinCallBannerVisible?: boolean;
    savedPostIds: Set<string>;
}

type onScrollEndIndexListenerEvent = (endIndex: number) => void;

type ScrollIndexFailed = {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const keyExtractor = (item: PostListItem | PostListOtherItem) => (item.type === 'post' ? item.value.id : item.value);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        scaleY: -1,
    },
    scale: {
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

const PostList = ({
    appsEnabled,
    channelId,
    contentContainerStyle,
    currentTimezone,
    currentUserId,
    currentUsername,
    customEmojiNames,
    disablePullToRefresh,
    footer,
    header,
    highlightedId,
    highlightPinnedOrSaved = true,
    isCRTEnabled,
    isTimezoneEnabled,
    lastViewedAt,
    location,
    nativeID,
    onEndReached,
    posts,
    rootId,
    shouldRenderReplyButton = true,
    shouldShowJoinLeaveMessages,
    showMoreMessages,
    showNewMessageLine = true,
    testID,
    currentCallBarVisible,
    joinCallBannerVisible,
    savedPostIds,
}: Props) => {
    const listRef = useRef<FlatList<string | PostModel>>(null);
    const onScrollEndIndexListener = useRef<onScrollEndIndexListenerEvent>();
    const onViewableItemsChangedListener = useRef<ViewableItemsChangedListenerEvent>();
    const scrolledToHighlighted = useRef(false);
    const [enableRefreshControl, setEnableRefreshControl] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const orderedPosts = useMemo(() => {
        return preparePostList(posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, currentTimezone, location === Screens.THREAD, savedPostIds);
    }, [posts, lastViewedAt, showNewMessageLine, currentTimezone, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, location, savedPostIds]);

    const initialIndex = useMemo(() => {
        return orderedPosts.findIndex((i) => i.type === 'start-of-new-messages');
    }, [orderedPosts]);

    useEffect(() => {
        const t = setTimeout(() => {
            listRef.current?.scrollToOffset({offset: 0, animated: true});
        }, 300);

        return () => clearTimeout(t);
    }, [channelId, rootId]);

    useEffect(() => {
        const scrollToBottom = (screen: string) => {
            if (screen === location) {
                const scrollToBottomTimer = setTimeout(() => {
                    listRef.current?.scrollToOffset({offset: 0, animated: true});
                    clearTimeout(scrollToBottomTimer);
                }, 400);
            }
        };

        const scrollBottomListener = DeviceEventEmitter.addListener(Events.POST_LIST_SCROLL_TO_BOTTOM, scrollToBottom);

        return () => {
            scrollBottomListener.remove();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (location === Screens.CHANNEL && channelId) {
            await fetchPosts(serverUrl, channelId);
        } else if (location === Screens.THREAD && rootId) {
            const options: FetchPaginatedThreadOptions = {};
            const lastPost = posts[0];
            if (lastPost) {
                options.fromCreateAt = lastPost.createAt;
                options.fromPost = lastPost.id;
                options.direction = 'down';
            }
            await fetchPostThread(serverUrl, rootId, options);
        }
        setRefreshing(false);
    }, [channelId, location, posts, rootId]);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (Platform.OS === 'android') {
            const {y} = event.nativeEvent.contentOffset;
            setEnableRefreshControl(y === 0);
        }
    }, []);

    const onScrollToIndexFailed = useCallback((info: ScrollIndexFailed) => {
        const index = Math.min(info.highestMeasuredFrameIndex, info.index);

        if (!highlightedId) {
            if (onScrollEndIndexListener.current) {
                onScrollEndIndexListener.current(index);
            }
            scrollToIndex(index);
        }
    }, [highlightedId]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${location}-${item.value.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);

        if (onViewableItemsChangedListener.current) {
            onViewableItemsChangedListener.current(viewableItems);
        }
    }, [location]);

    const registerScrollEndIndexListener = useCallback((listener: onScrollEndIndexListenerEvent) => {
        onScrollEndIndexListener.current = listener;
        const removeListener = () => {
            onScrollEndIndexListener.current = undefined;
        };

        return removeListener;
    }, []);

    const registerViewableItemsListener = useCallback((listener: ViewableItemsChangedListenerEvent) => {
        onViewableItemsChangedListener.current = listener;
        const removeListener = () => {
            onViewableItemsChangedListener.current = undefined;
        };

        return removeListener;
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<PostListItem | PostListOtherItem>) => {
        switch (item.type) {
            case 'start-of-new-messages':
                return (
                    <NewMessagesLine
                        key={item.value}
                        theme={theme}
                        testID={`${testID}.new_messages_line`}
                        style={styles.scale}
                    />
                );
            case 'date':
                return (
                    <DateSeparator
                        key={item.value}
                        date={getDateForDateLine(item.value)}
                        style={styles.scale}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            case 'thread-overview':
                return (
                    <ThreadOverview
                        key={item.value}
                        rootId={rootId!}
                        testID={`${testID}.thread_overview`}
                        style={styles.scale}
                    />
                );
            case 'user-activity': {
                const postProps = {
                    currentUsername,
                    key: item.value,
                    postId: item.value,
                    location,
                    style: Platform.OS === 'ios' ? styles.scale : styles.container,
                    testID: `${testID}.combined_user_activity`,
                    showJoinLeave: shouldShowJoinLeaveMessages,
                    theme,
                };

                return (<CombinedUserActivity {...postProps}/>);
            }
            default: {
                const post = item.value;
                const skipSaveddHeader = (location === Screens.THREAD && post.id === rootId);
                const postProps = {
                    appsEnabled,
                    customEmojiNames,
                    isCRTEnabled,
                    highlight: highlightedId === post.id,
                    highlightPinnedOrSaved,
                    isSaved: post.isSaved,
                    key: post.id,
                    location,
                    nextPost: post.nextPost,
                    post,
                    previousPost: post.previousPost,
                    rootId,
                    shouldRenderReplyButton,
                    skipSaveddHeader,
                    style: styles.scale,
                    testID: `${testID}.post`,
                };

                return (<Post {...postProps}/>);
            }
        }
    }, [appsEnabled, currentTimezone, customEmojiNames, highlightPinnedOrSaved, isCRTEnabled, isTimezoneEnabled, shouldRenderReplyButton, theme]);

    const scrollToIndex = useCallback((index: number, animated = true, applyOffset = true) => {
        listRef.current?.scrollToIndex({
            animated,
            index,
            viewOffset: applyOffset ? Platform.select({ios: -45, default: 0}) : 0,
            viewPosition: 1, // 0 is at bottom
        });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (highlightedId && orderedPosts && !scrolledToHighlighted.current) {
                scrolledToHighlighted.current = true;
                // eslint-disable-next-line max-nested-callbacks
                const index = orderedPosts.findIndex((p) => p.type === 'post' && p.value.id === highlightedId);
                if (index >= 0 && listRef.current) {
                    listRef.current?.scrollToIndex({
                        animated: true,
                        index,
                        viewOffset: 0,
                        viewPosition: 0.5, // 0 is at bottom
                    });
                }
            }
        }, 500);

        return () => clearTimeout(t);
    }, [orderedPosts, highlightedId]);

    return (
        <>
            <PostListRefreshControl
                enabled={!disablePullToRefresh && enableRefreshControl}
                refreshing={refreshing}
                onRefresh={onRefresh}
                style={styles.container}
            >
                <AnimatedFlatList
                    contentContainerStyle={contentContainerStyle}
                    data={orderedPosts}
                    keyboardDismissMode='interactive'
                    keyboardShouldPersistTaps='handled'
                    keyExtractor={keyExtractor}
                    initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                    ListHeaderComponent={header}
                    ListFooterComponent={footer}
                    maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                    maxToRenderPerBatch={10}
                    nativeID={nativeID}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.9}
                    onScroll={onScroll}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    onViewableItemsChanged={onViewableItemsChanged}
                    ref={listRef}
                    removeClippedSubviews={true}
                    renderItem={renderItem}
                    scrollEventThrottle={60}
                    style={styles.flex}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    testID={`${testID}.flat_list`}
                />
            </PostListRefreshControl>
            {showMoreMessages &&
            <MoreMessages
                channelId={channelId}
                isCRTEnabled={isCRTEnabled}
                newMessageLineIndex={initialIndex}
                posts={orderedPosts}
                registerScrollEndIndexListener={registerScrollEndIndexListener}
                registerViewableItemsListener={registerViewableItemsListener}
                rootId={rootId}
                scrollToIndex={scrollToIndex}
                theme={theme}
                testID={`${testID}.more_messages_button`}
                currentCallBarVisible={Boolean(currentCallBarVisible)}
                joinCallBannerVisible={Boolean(joinCallBannerVisible)}
            />
            }
        </>
    );
};

export default PostList;
