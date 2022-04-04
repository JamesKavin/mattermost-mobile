// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import {BOTTOM_TAB_ICON_SIZE} from '@constants/view';
import {subscribeAllServers} from '@database/subscription/servers';
import {subscribeUnreadAndMentionsByServer} from '@database/subscription/unreads';
import {changeOpacity} from '@utils/theme';

import type ServersModel from '@typings/database/models/app/servers';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type {UnreadMessages, UnreadSubscription} from '@typings/database/subscriptions';

type Props = {
    isFocused: boolean;
    theme: Theme;
}

const subscriptions: Map<string, UnreadSubscription> = new Map();

const style = StyleSheet.create({
    unread: {
        left: 19,
        top: 4,
    },
    mentionsOneDigit: {
        left: 12,
    },
    mentionsTwoDigits: {
        left: 13,
    },
    mentionsThreeDigits: {
        left: 10,
    },
});

const Home = ({isFocused, theme}: Props) => {
    const [total, setTotal] = useState<UnreadMessages>({mentions: 0, unread: false});

    const updateTotal = () => {
        let unread = false;
        let mentions = 0;
        subscriptions.forEach((value) => {
            unread = unread || value.unread;
            mentions += value.mentions;
        });
        setTotal({mentions, unread});
    };

    const unreadsSubscription = (serverUrl: string, myChannels: MyChannelModel[]) => {
        const unreads = subscriptions.get(serverUrl);
        if (unreads) {
            let mentions = 0;
            let unread = false;
            for (const myChannel of myChannels) {
                mentions += myChannel.mentionsCount;
                unread = unread || myChannel.isUnread;
            }

            unreads.mentions = mentions;
            unreads.unread = unread;
            subscriptions.set(serverUrl, unreads);
            updateTotal();
        }
    };

    const serversObserver = async (servers: ServersModel[]) => {
        // unsubscribe mentions from servers that were removed
        const allUrls = new Set(servers.map((s) => s.url));
        const subscriptionsToRemove = [...subscriptions].filter(([key]) => !allUrls.has(key));
        for (const [key, map] of subscriptionsToRemove) {
            map.subscription?.unsubscribe();
            subscriptions.delete(key);
            updateTotal();
        }

        for (const server of servers) {
            const {lastActiveAt, url} = server;
            if (lastActiveAt && !subscriptions.has(url)) {
                const unreads: UnreadSubscription = {
                    mentions: 0,
                    unread: false,
                };
                subscriptions.set(url, unreads);
                unreads.subscription = subscribeUnreadAndMentionsByServer(url, unreadsSubscription);
            } else if (!lastActiveAt && subscriptions.has(url)) {
                subscriptions.get(url)?.subscription?.unsubscribe();
                subscriptions.delete(url);
                updateTotal();
            }
        }
    };

    useEffect(() => {
        const subscription = subscribeAllServers(serversObserver);

        return () => {
            subscription?.unsubscribe();
            subscriptions.forEach((unreads) => {
                unreads.subscription?.unsubscribe();
            });
            subscriptions.clear();
        };
    }, []);

    let unreadStyle;
    if (total.mentions) {
        unreadStyle = style.mentionsOneDigit;
        if (total.mentions > 9) {
            unreadStyle = style.mentionsTwoDigits;
        } else if (total.mentions > 99) {
            unreadStyle = style.mentionsThreeDigits;
        }
    } else if (total.unread) {
        unreadStyle = style.unread;
    }

    return (
        <View>
            <CompassIcon
                size={BOTTOM_TAB_ICON_SIZE}
                name='home-variant-outline'
                color={isFocused ? theme.buttonBg : changeOpacity(theme.centerChannelColor, 0.48)}
            />
            <Badge
                backgroundColor={theme.buttonBg}
                borderColor={theme.centerChannelBg}
                color={theme.buttonColor}
                style={unreadStyle}
                visible={!isFocused && Boolean(unreadStyle)}
                type='Small'
                value={total.mentions || (total.unread ? -1 : 0)}
            />
        </View>
    );
};

export default Home;
