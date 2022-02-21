// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {SEARCH} from '@constants/screens';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type PostModel from '@typings/database/models/servers/post';

type HeaderReplyProps = {
    commentCount: number;
    location: string;
    post: PostModel;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        replyWrapper: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        replyIconContainer: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            minWidth: 40,
            paddingTop: 2,
            paddingBottom: 10,
            flex: 1,
        },
        replyText: {
            fontSize: 12,
            marginLeft: 2,
            marginTop: 2,
            color: theme.linkColor,
        },
    };
});

const HeaderReply = ({commentCount, location, post, theme}: HeaderReplyProps) => {
    const style = getStyleSheet(theme);

    const onPress = useCallback(preventDoubleTap(() => {
        // https://mattermost.atlassian.net/browse/MM-39708
        goToScreen('THREADS_SCREEN_NOT_IMPLEMENTED_YET', '', {post});
    }), []);

    return (
        <View
            testID='post_header.reply'
            style={style.replyWrapper}
        >
            <TouchableWithFeedback
                onPress={onPress}
                style={style.replyIconContainer}
                type={'opacity'}
            >
                <CompassIcon
                    name='reply-outline'
                    size={18}
                    color={theme.linkColor}
                />
                {location !== SEARCH && commentCount > 0 &&
                <Text
                    style={style.replyText}
                    testID='post_header.reply.count'
                >
                    {commentCount}
                </Text>
                }
            </TouchableWithFeedback>
        </View>
    );
};

export default HeaderReply;
