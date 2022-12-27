// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

// import AddPeopleBox from '@components/channel_actions/add_people_box';
import FavoriteBox from '@components/channel_actions/favorite_box';
import InfoBox from '@components/channel_actions/info_box';
import SetHeaderBox from '@components/channel_actions/set_header_box';

type Props = {
    channelId: string;
    header?: boolean;
    favorite?: boolean;
    people?: boolean;
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 8,
        marginTop: 28,
        width: '100%',
    },
    margin: {
        marginRight: 8,
    },
    item: {
        alignItems: 'center',
        borderRadius: 4,
        height: 70,
        justifyContent: 'center',
        maxHeight: undefined,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: 112,
    },
});

const IntroOptions = ({channelId, header, favorite}: Props) => {
    return (
        <View style={styles.container}>
            {/* Add back in after MM-47655 is resolved. https://mattermost.atlassian.net/browse/MM-47655
            {people &&
            <AddPeopleBox
                channelId={channelId}
                containerStyle={[styles.item, styles.margin]}
                testID='channel_post_list.intro_options.add_people.action'
            />
            }
            */}
            {header &&
            <SetHeaderBox
                channelId={channelId}
                containerStyle={[styles.item, styles.margin]}
                testID='channel_post_list.intro_options.set_header.action'
            />
            }
            {favorite &&
            <FavoriteBox
                channelId={channelId}
                containerStyle={[styles.item, styles.margin]}
                testID='channel_post_list.intro_options'
            />
            }
            <InfoBox
                channelId={channelId}
                containerStyle={styles.item}
                testID='channel_post_list.intro_options.channel_info.action'
            />
        </View>
    );
};

export default IntroOptions;
