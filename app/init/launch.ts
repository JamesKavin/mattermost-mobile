// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm from '@mattermost/react-native-emm';
import {Alert, DeviceEventEmitter, Linking, Platform} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {appEntry, pushNotificationEntry, upgradeEntry} from '@actions/remote/entry';
import LocalConfig from '@assets/config.json';
import {DeepLink, Events, Launch, PushNotification} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials, removeServerCredentials} from '@init/credentials';
import {getOnboardingViewed} from '@queries/app/global';
import {getThemeForCurrentTeam} from '@queries/servers/preference';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {resetToHome, resetToSelectServer, resetToTeams, resetToOnboarding} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {getLaunchPropsFromDeepLink} from '@utils/deep_link';
import {logInfo} from '@utils/log';
import {convertToNotificationData} from '@utils/notification';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

const initialNotificationTypes = [PushNotification.NOTIFICATION_TYPE.MESSAGE, PushNotification.NOTIFICATION_TYPE.SESSION];

export const initialLaunch = async () => {
    const deepLinkUrl = await Linking.getInitialURL();
    if (deepLinkUrl) {
        await launchAppFromDeepLink(deepLinkUrl, true);
        return;
    }

    const notification = await Notifications.getInitialNotification();
    let tapped = Platform.select({android: true, ios: false})!;
    if (Platform.OS === 'ios' && notification) {
        // when a notification is received on iOS, getInitialNotification, will return the notification
        // as the app will initialized cause we are using background fetch,
        // that does not necessarily mean that the app was opened cause of the notification was tapped.
        // Here we are going to dettermine if the notification still exists in NotificationCenter to determine if
        // the app was opened because of a tap or cause of the background fetch init
        const delivered = await Notifications.ios.getDeliveredNotifications();
        tapped = delivered.find((d) => (d as unknown as NotificationData).ack_id === notification?.payload.ack_id) == null;
    }
    if (initialNotificationTypes.includes(notification?.payload?.type) && tapped) {
        await launchAppFromNotification(convertToNotificationData(notification!), true);
        return;
    }

    await launchApp({launchType: Launch.Normal, coldStart: true});
};

const launchAppFromDeepLink = async (deepLinkUrl: string, coldStart = false) => {
    const props = getLaunchPropsFromDeepLink(deepLinkUrl, coldStart);
    return launchApp(props);
};

const launchAppFromNotification = async (notification: NotificationWithData, coldStart = false) => {
    const props = await getLaunchPropsFromNotification(notification, coldStart);
    return launchApp(props);
};

/**
 *
 * @param props set of properties used to determine how to launch the app depending on the containing values
 * @param resetNavigation used when loading the add_server screen and remove all the navigation stack

 * @returns a redirection to a screen, either onboarding, add_server, login or home depending on the scenario
 */
const launchApp = async (props: LaunchProps) => {
    let serverUrl: string | undefined;
    switch (props?.launchType) {
        case Launch.DeepLink:
            if (props.extra?.type !== DeepLink.Invalid) {
                const extra = props.extra as DeepLinkWithData;
                const existingServer = DatabaseManager.searchUrl(extra.data!.serverUrl);
                serverUrl = existingServer;
                props.serverUrl = serverUrl || extra.data?.serverUrl;
                if (!serverUrl) {
                    props.launchError = true;
                }
            }
            break;
        case Launch.Notification: {
            serverUrl = props.serverUrl;
            const extra = props.extra as NotificationWithData;
            const sessionExpiredNotification = Boolean(props.serverUrl && extra.payload?.type === PushNotification.NOTIFICATION_TYPE.SESSION);
            if (sessionExpiredNotification) {
                DeviceEventEmitter.emit(Events.SESSION_EXPIRED, serverUrl);
                return '';
            }
            break;
        }
        default:
            serverUrl = await getActiveServerUrl();
            break;
    }

    if (props.launchError && !serverUrl) {
        serverUrl = await getActiveServerUrl();
    }

    if (serverUrl) {
        const credentials = await getServerCredentials(serverUrl);
        if (credentials) {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            let hasCurrentUser = false;
            if (database) {
                EphemeralStore.theme = await getThemeForCurrentTeam(database);
                const currentUserId = await getCurrentUserId(database);
                hasCurrentUser = Boolean(currentUserId);
            }

            let launchType = props.launchType;
            if (!hasCurrentUser) {
                // migrating from v1
                if (launchType === Launch.Normal) {
                    launchType = Launch.Upgrade;
                }

                const result = await upgradeEntry(serverUrl);
                if (result.error) {
                    Alert.alert(
                        'Error Upgrading',
                        `An error occurred while upgrading the app to the new version.\n\nDetails: ${result.error}\n\nThe app will now quit.`,
                        [{
                            text: 'OK',
                            onPress: async () => {
                                await DatabaseManager.destroyServerDatabase(serverUrl!);
                                await removeServerCredentials(serverUrl!);
                                Emm.exitApp();
                            },
                        }],
                    );
                    return '';
                }
            }

            return launchToHome({...props, launchType, serverUrl});
        }
    }

    const onboardingViewed = LocalConfig.ShowOnboarding && await getOnboardingViewed();

    // if the config value is set and the onboarding has not been seeing yet, show the onboarding
    if (LocalConfig.ShowOnboarding && !onboardingViewed) {
        return resetToOnboarding(props);
    }

    return resetToSelectServer(props);
};

const launchToHome = async (props: LaunchProps) => {
    let openPushNotification = false;

    switch (props.launchType) {
        case Launch.DeepLink: {
            appEntry(props.serverUrl!);
            break;
        }
        case Launch.Notification: {
            const extra = props.extra as NotificationWithData;
            openPushNotification = Boolean(props.serverUrl && !props.launchError && extra.userInteraction && extra.payload?.channel_id && !extra.payload?.userInfo?.local);
            if (openPushNotification) {
                pushNotificationEntry(props.serverUrl!, extra);
            } else {
                appEntry(props.serverUrl!);
            }
            break;
        }
        case Launch.Normal:
            appEntry(props.serverUrl!);
            break;
    }

    let nTeams = 0;
    if (props.serverUrl) {
        const database = DatabaseManager.serverDatabases[props.serverUrl]?.database;
        if (database) {
            nTeams = await queryMyTeams(database).fetchCount();
        }
    }

    if (nTeams) {
        logInfo('Launch app in Home screen');
        return resetToHome(props);
    }

    logInfo('Launch app in Select Teams screen');
    return resetToTeams();
};

export const relaunchApp = (props: LaunchProps) => {
    return launchApp(props);
};

export const getLaunchPropsFromNotification = async (notification: NotificationWithData, coldStart = false): Promise<LaunchProps> => {
    const launchProps: LaunchProps = {
        launchType: Launch.Notification,
        coldStart,
    };

    const {payload} = notification;
    launchProps.extra = notification;

    if (payload?.server_url) {
        launchProps.serverUrl = payload.server_url;
    } else if (payload?.server_id) {
        const serverUrl = await DatabaseManager.getServerUrlFromIdentifier(payload.server_id);
        if (serverUrl) {
            launchProps.serverUrl = serverUrl;
        } else {
            launchProps.launchError = true;
        }
    } else {
        launchProps.launchError = true;
    }

    return launchProps;
};
