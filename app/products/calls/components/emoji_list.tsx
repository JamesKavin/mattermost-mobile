// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import EmojiPill from '@calls/components/emoji_pill';
import {ReactionStreamEmoji} from '@calls/types/calls';

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
        height: 48,
    },
    emojiList: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: 10,
        paddingRight: 10,
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '100%',
    },
});

const gradient = {
    start: {x: 0.75, y: 0},
    end: {x: 1, y: 0},
    colors: ['#00000000', '#000000'],
};

interface Props {
    reactionStream: ReactionStreamEmoji[];
}

const EmojiList = ({reactionStream}: Props) => {
    return (
        <View style={styles.container}>
            <View style={styles.emojiList}>
                {reactionStream.map((e) => (
                    <EmojiPill
                        key={e.latestTimestamp}
                        name={e.name}
                        count={e.count}
                    />
                ))}
            </View>
            <LinearGradient
                start={gradient.start}
                end={gradient.end}
                colors={gradient.colors}
                style={styles.gradient}
            />
        </View>
    );
};

export default EmojiList;
