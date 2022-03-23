// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, PanResponder} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {fetchUsersByIds} from '@actions/remote/user';
import {useServerUrl} from '@context/server';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';

type Props = {
    reactions: ReactionModel[];
}

const ReactorsList = ({reactions}: Props) => {
    const serverUrl = useServerUrl();
    const [enabled, setEnabled] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const listRef = useRef<FlatList>(null);
    const prevOffset = useRef(0);
    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, g) => {
            const dir = prevOffset.current < g.dy ? 'down' : 'up';
            prevOffset.current = g.dy;
            if (!enabled && dir === 'up') {
                setEnabled(true);
            }
            setDirection(dir);
            return false;
        },
    })).current;

    const renderItem = useCallback(({item}) => (
        <Reactor reaction={item}/>
    ), [reactions]);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.nativeEvent.contentOffset.y <= 0 && enabled && direction === 'down') {
            setEnabled(false);
            listRef.current?.scrollToOffset({animated: true, offset: 0});
        }
    }, [enabled, direction]);

    useEffect(() => {
        const userIds = reactions.map((r) => r.userId);

        // Fetch any missing user
        fetchUsersByIds(serverUrl, userIds);
    }, []);

    return (
        <FlatList
            data={reactions}
            ref={listRef}
            renderItem={renderItem}
            onScroll={onScroll}
            overScrollMode={'always'}
            scrollEnabled={enabled}
            scrollEventThrottle={60}
            {...panResponder.panHandlers}
        />
    );
};

export default ReactorsList;

