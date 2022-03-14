// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import {addReaction, removeReaction} from '@actions/remote/reactions';
import CompassIcon from '@components/compass_icon';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {showModal, showModalOverCurrentContext} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Reaction from './reaction';

import type ReactionModel from '@typings/database/models/servers/reaction';

type ReactionsProps = {
    canAddReaction: boolean;
    canRemoveReaction: boolean;
    disabled: boolean;
    currentUserId: string;
    postId: string;
    reactions: ReactionModel[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        addReaction: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        reaction: {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            flexDirection: 'row',
            height: 32,
            marginBottom: 12,
            marginRight: 6,
            paddingVertical: 4,
            paddingHorizontal: 6,
            width: 36,
        },
        reactionsContainer: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            marginTop: 12,
        },
    };
});

const Reactions = ({currentUserId, canAddReaction, canRemoveReaction, disabled, postId, reactions, theme}: ReactionsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const pressed = useRef(false);
    const [sortedReactions, setSortedReactions] = useState(new Set(reactions.map((r) => r.emojiName)));
    const styles = getStyleSheet(theme);

    useEffect(() => {
        // This helps keep the reactions in the same position at all times until unmounted
        const rs = reactions.map((r) => r.emojiName);
        const sorted = new Set([...sortedReactions]);
        const added = rs.filter((r) => !sorted.has(r));
        added.forEach(sorted.add, sorted);
        const removed = [...sorted].filter((s) => !rs.includes(s));
        removed.forEach(sorted.delete, sorted);
        setSortedReactions(sorted);
    }, [reactions]);

    const buildReactionsMap = useCallback(() => {
        const highlightedReactions: string[] = [];

        const reactionsByName = reactions.reduce((acc, reaction) => {
            if (reaction) {
                if (acc.has(reaction.emojiName)) {
                    acc.get(reaction.emojiName)!.push(reaction);
                } else {
                    acc.set(reaction.emojiName, [reaction]);
                }

                if (reaction.userId === currentUserId) {
                    highlightedReactions.push(reaction.emojiName);
                }
            }

            return acc;
        }, new Map<string, ReactionModel[]>());

        return {reactionsByName, highlightedReactions};
    }, [sortedReactions]);

    const handleAddReactionToPost = (emoji: string) => {
        addReaction(serverUrl, postId, emoji);
    };

    const handleAddReaction = preventDoubleTap(() => {
        const screen = 'AddReaction';
        const title = intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});

        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const passProps = {
            closeButton,
            onEmojiPress: handleAddReactionToPost,
        };

        showModal(screen, title, passProps);
    });

    const handleReactionPress = async (emoji: string, remove: boolean) => {
        pressed.current = true;
        if (remove && canRemoveReaction && !disabled) {
            await removeReaction(serverUrl, postId, emoji);
        } else if (!remove && canAddReaction && !disabled) {
            await addReaction(serverUrl, postId, emoji);
        }

        pressed.current = false;
    };

    const showReactionList = () => {
        const screen = 'ReactionList';
        const passProps = {
            postId,
        };

        if (!pressed.current) {
            showModalOverCurrentContext(screen, passProps);
        }
    };

    let addMoreReactions = null;
    const {reactionsByName, highlightedReactions} = buildReactionsMap();
    if (!disabled && canAddReaction && reactionsByName.size < MAX_ALLOWED_REACTIONS) {
        addMoreReactions = (
            <TouchableOpacity
                key='addReaction'
                onPress={handleAddReaction}
                style={styles.reaction}
            >
                <CompassIcon
                    name='emoticon-plus-outline'
                    size={24}
                    style={styles.addReaction}
                />
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.reactionsContainer}>
            {
                Array.from(sortedReactions).map((r) => {
                    const reaction = reactionsByName.get(r);
                    return (
                        <Reaction
                            key={r}
                            count={reaction!.length}
                            emojiName={r}
                            highlight={highlightedReactions.includes(r)}
                            onPress={handleReactionPress}
                            onLongPress={showReactionList}
                            theme={theme}
                        />
                    );
                })
            }
            {addMoreReactions}
        </View>
    );
};

export default React.memo(Reactions);
