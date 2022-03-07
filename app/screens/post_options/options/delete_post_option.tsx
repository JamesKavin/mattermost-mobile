// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {deletePost} from '@actions/remote/post';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from './base_option';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    combinedPost?: Post;
    post: PostModel;
}
const DeletePostOption = ({combinedPost, post}: Props) => {
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();

    const onPress = useCallback(() => {
        Alert.alert(
            formatMessage({id: 'mobile.post.delete_title', defaultMessage: 'Delete Post'}),
            formatMessage({
                id: 'mobile.post.delete_question',
                defaultMessage: 'Are you sure you want to delete this post?',
            }),
            [{
                text: formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            }, {
                text: formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: () => {
                    deletePost(serverUrl, combinedPost || post);
                    dismissBottomSheet(Screens.POST_OPTIONS);
                },
            }],
        );
    }, [post, combinedPost, serverUrl]);

    return (
        <BaseOption
            i18nId={t('post_info.del')}
            defaultMessage='Delete'
            iconName='trash-can-outline'
            onPress={onPress}
            testID='post.options.delete.post'
            isDestructive={true}
        />
    );
};

export default DeletePostOption;
