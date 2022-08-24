// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {General, Screens} from '@constants';
import {t} from '@i18n';
import {gotoSettingsScreen} from '@screens/settings/config';
import {getEmailInterval, getEmailIntervalTexts, getNotificationProps} from '@utils/user';

import SettingContainer from '../setting_container';
import SettingItem from '../setting_item';

import type UserModel from '@typings/database/models/servers/user';

const mentionTexts = {
    crtOn: {
        id: t('notification_settings.mentions'),
        defaultMessage: 'Mentions',
    },
    crtOff: {
        id: t('notification_settings.mentions_replies'),
        defaultMessage: 'Mentions and Replies',
    },
};

type NotificationsProps = {
    currentUser: UserModel;
    emailInterval: string;
    enableAutoResponder: boolean;
    enableEmailBatching: boolean;
    isCRTEnabled: boolean;
    sendEmailNotifications: boolean;
}
const Notifications = ({
    currentUser,
    emailInterval,
    enableAutoResponder,
    enableEmailBatching,
    isCRTEnabled,
    sendEmailNotifications,
}: NotificationsProps) => {
    const intl = useIntl();
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const emailIntervalPref = useMemo(() =>
        getEmailInterval(
            sendEmailNotifications && notifyProps?.email === 'true',
            enableEmailBatching,
            parseInt(emailInterval, 10),
        ).toString(),
    [emailInterval, enableEmailBatching, notifyProps, sendEmailNotifications]);

    const goToNotificationSettingsMentions = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_MENTION;

        const id = isCRTEnabled ? t('notification_settings.mentions') : t('notification_settings.mentions_replies');
        const defaultMessage = isCRTEnabled ? 'Mentions' : 'Mentions and Replies';
        const title = intl.formatMessage({id, defaultMessage});
        gotoSettingsScreen(screen, title);
    }, [isCRTEnabled]);

    const goToNotificationSettingsPush = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_PUSH;
        const title = intl.formatMessage({
            id: 'notification_settings.push_notification',
            defaultMessage: 'Push Notifications',
        });

        gotoSettingsScreen(screen, title);
    }, []);

    const goToNotificationAutoResponder = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_AUTO_RESPONDER;
        const title = intl.formatMessage({
            id: 'notification_settings.auto_responder',
            defaultMessage: 'Automatic Replies',
        });
        gotoSettingsScreen(screen, title);
    }, []);

    const goToEmailSettings = useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION_EMAIL;
        const title = intl.formatMessage({id: 'notification_settings.email', defaultMessage: 'Email Notifications'});
        gotoSettingsScreen(screen, title);
    }, []);

    return (
        <SettingContainer testID='notification_settings'>
            <SettingItem
                onPress={goToNotificationSettingsMentions}
                optionName='mentions'
                label={intl.formatMessage({
                    id: isCRTEnabled ? mentionTexts.crtOn.id : mentionTexts.crtOff.id,
                    defaultMessage: isCRTEnabled ? mentionTexts.crtOn.defaultMessage : mentionTexts.crtOff.defaultMessage,
                })}
                testID='notification_settings.mentions.option'
            />
            <SettingItem
                optionName='push_notification'
                onPress={goToNotificationSettingsPush}
                testID='notification_settings.push_notifications.option'
            />
            <SettingItem
                optionName='email'
                onPress={goToEmailSettings}
                info={intl.formatMessage(getEmailIntervalTexts(emailIntervalPref))}
                testID='notification_settings.email_notifications.option'
            />
            {enableAutoResponder && (
                <SettingItem
                    onPress={goToNotificationAutoResponder}
                    optionName='automatic_dm_replies'
                    info={currentUser.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active === 'true' ? 'On' : 'Off'}
                    testID='notification_settings.automatic_replies.option'
                />
            )}
        </SettingContainer>
    );
};

export default Notifications;
