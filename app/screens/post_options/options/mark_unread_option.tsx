// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {markPostAsUnread} from '@actions/remote/post';
import Screens from '@constants/screens';
import {useServerUrl} from '@context/server';
import {t} from '@i18n';
import {dismissBottomSheet} from '@screens/navigation';

import BaseOption from './base_option';

type Props = {
    postId: string;
}

const MarkAsUnreadOption = ({postId}: Props) => {
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        markPostAsUnread(serverUrl, postId);
        dismissBottomSheet(Screens.POST_OPTIONS);
    }, [serverUrl, postId]);

    return (
        <BaseOption
            i18nId={t('mobile.post_info.mark_unread')}
            defaultMessage='Mark as Unread'
            iconName='mark-as-unread'
            onPress={onPress}
            testID='post.options.mark.unread'
        />
    );
};

export default MarkAsUnreadOption;
