// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, Text} from 'react-native';

import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {useTheme} from '@context/theme';
import {typography} from '@utils/typography';

import ChannelListItem from './body/channel';

import type ChannelModel from '@typings/database/models/servers/channel';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    heading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
        paddingLeft: 18,
        paddingVertical: 8,
        marginTop: 12,
    },
}));

type UnreadCategoriesProps = {
    unreadChannels: ChannelModel[];
    currentChannelId: string;
}

const UnreadCategories = ({unreadChannels, currentChannelId}: UnreadCategoriesProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const renderItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelListItem
                channel={item}
                isActive={item.id === currentChannelId}
                collapsed={false}
            />
        );
    }, [currentChannelId]);

    return (
        <>
            <Text
                style={styles.heading}
            >
                {intl.formatMessage({id: 'mobile.channel_list.unreads', defaultMessage: 'UNREADS'})}
            </Text>
            <FlatList
                data={unreadChannels}
                renderItem={renderItem}
            />
        </>
    );
};

export default UnreadCategories;