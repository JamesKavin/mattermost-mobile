// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {Platform} from 'react-native';

import {updateMe} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';
import SettingSeparator from '@screens/settings/settings_separator';
import {getNotificationProps} from '@utils/user';

import SettingContainer from '../setting_container';

import MobileSendPush from './push_send';
import MobilePushStatus from './push_status';
import MobilePushThread from './push_thread';

import type UserModel from '@typings/database/models/servers/user';

type NotificationMobileProps = {
    componentId: string;
    currentUser: UserModel;
    isCRTEnabled: boolean;
    sendPushNotifications: boolean;
};
const NotificationPush = ({componentId, currentUser, isCRTEnabled, sendPushNotifications}: NotificationMobileProps) => {
    const serverUrl = useServerUrl();

    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const [pushSend, setPushSend] = useState<UserNotifyPropsPush>(notifyProps.push);
    const [pushStatus, setPushStatus] = useState<UserNotifyPropsPushStatus>(notifyProps.push_status);
    const [pushThread, setPushThreadPref] = useState<UserNotifyPropsPushThreads>(notifyProps?.push_threads || 'all');

    const onMobilePushThreadChanged = useCallback(() => {
        setPushThreadPref(pushThread === 'all' ? 'mention' : 'all');
    }, [pushThread]);

    const close = () => popTopScreen(componentId);

    const canSaveSettings = useCallback(() => {
        const p = pushSend !== notifyProps.push;
        const pT = pushThread !== notifyProps.push_threads;
        const pS = pushStatus !== notifyProps.push_status;
        return p || pT || pS;
    }, [notifyProps, pushSend, pushStatus, pushThread]);

    const saveNotificationSettings = useCallback(() => {
        const canSave = canSaveSettings();
        if (canSave) {
            const notify_props: UserNotifyProps = {
                ...notifyProps,
                push: pushSend,
                push_status: pushStatus,
                push_threads: pushThread,
            };
            updateMe(serverUrl, {notify_props});
        }
        close();
    }, [canSaveSettings, close, notifyProps, pushSend, pushStatus, pushThread, serverUrl]);

    useBackNavigation(saveNotificationSettings);

    useAndroidHardwareBackHandler(componentId, saveNotificationSettings);

    return (
        <SettingContainer testID='push_notification_settings'>
            <MobileSendPush
                pushStatus={pushSend}
                sendPushNotifications={sendPushNotifications}
                setMobilePushPref={setPushSend}
            />
            {Platform.OS === 'android' && (<SettingSeparator isGroupSeparator={true}/>)}
            {isCRTEnabled && pushSend === 'mention' && (
                <MobilePushThread
                    pushThread={pushThread}
                    onMobilePushThreadChanged={onMobilePushThreadChanged}
                />
            )}
            {Platform.OS === 'android' && (<SettingSeparator isGroupSeparator={true}/>)}
            {sendPushNotifications && pushSend !== 'none' && (
                <MobilePushStatus
                    pushStatus={pushStatus}
                    setMobilePushStatus={setPushStatus}
                />
            )}
        </SettingContainer>
    );
};

export default NotificationPush;
