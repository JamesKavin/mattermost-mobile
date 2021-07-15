// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, DeviceEventEmitter, Linking, Platform} from 'react-native';
import CookieManager, {Cookie} from '@react-native-cookies/cookies';
import semver from 'semver';

import {fetchConfigAndLicense} from '@actions/remote/systems';
import LocalConfig from '@assets/config.json';
import {General, REDIRECT_URL_SCHEME, REDIRECT_URL_SCHEME_DEV} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations, resetMomentLocale, t} from '@i18n';
import * as analytics from '@init/analytics';
import {getServerCredentials, removeServerCredentials} from '@init/credentials';
import {getLaunchPropsFromDeepLink, relaunchApp} from '@init/launch';
import NetworkManager from '@init/network_manager';
import PushNotifications from '@init/push_notifications';
import {queryCurrentUser} from '@queries/servers/user';
import {LaunchType} from '@typings/launch';
import {deleteFileCache} from '@utils/file';

type LinkingCallbackArg = {url: string};

class GlobalEventHandler {
    JavascriptAndNativeErrorHandler: jsAndNativeErrorHandler | undefined;

    constructor() {
        DeviceEventEmitter.addListener(General.SERVER_LOGOUT, this.onLogout);
        DeviceEventEmitter.addListener(General.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        DeviceEventEmitter.addListener(General.CONFIG_CHANGED, this.onServerConfigChanged);

        Linking.addEventListener('url', this.onDeepLink);
    }

    init = () => {
        this.JavascriptAndNativeErrorHandler = require('@utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler?.initializeErrorHandling();
    };

    configureAnalytics = async (serverUrl: string, config?: ClientConfig) => {
        if (serverUrl && config?.DiagnosticsEnabled === 'true' && config?.DiagnosticId && LocalConfig.RudderApiKey) {
            let client = analytics.get(serverUrl);
            if (!client) {
                client = analytics.create(serverUrl);
            }

            await client.init(config);
        }
    };

    onDeepLink = (event: LinkingCallbackArg) => {
        if (event.url?.startsWith(REDIRECT_URL_SCHEME) || event.url?.startsWith(REDIRECT_URL_SCHEME_DEV)) {
            return;
        }

        if (event.url) {
            const props = getLaunchPropsFromDeepLink(event.url);
            relaunchApp(props);
        }
    };

    clearCookies = async (serverUrl: string, webKit: boolean) => {
        try {
            const cookies = await CookieManager.get(serverUrl, webKit);
            const values = Object.values(cookies);
            values.forEach((cookie: Cookie) => {
                CookieManager.clearByName(serverUrl, cookie.name, webKit);
            });
        } catch (error) {
            // Nothing to clear
        }
    }

    clearCookiesForServer = async (serverUrl: string) => {
        this.clearCookies(serverUrl, false);
        if (Platform.OS === 'ios') {
            // Also delete any cookies that were set by react-native-webview
            this.clearCookies(serverUrl, true);
        } else if (Platform.OS === 'android') {
            CookieManager.flush();
        }
    };

    onLogout = async (serverUrl: string) => {
        await removeServerCredentials(serverUrl);

        // TODO WebSocket: invalidate WebSocket client
        NetworkManager.invalidateClient(serverUrl);
        await DatabaseManager.deleteServerDatabase(serverUrl);

        const analyticsClient = analytics.get(serverUrl);
        if (analyticsClient) {
            analyticsClient.reset();
            analytics.invalidate(serverUrl);
        }

        deleteFileCache(serverUrl);
        PushNotifications.clearNotifications(serverUrl);

        this.resetLocale();
        this.clearCookiesForServer(serverUrl);
        relaunchApp({launchType: LaunchType.Normal}, true);
    };

    onServerConfigChanged = ({serverUrl, config}: {serverUrl: string; config: ClientConfig}) => {
        this.configureAnalytics(serverUrl, config);

        if (config.ExtendSessionLengthWithActivity === 'true') {
            PushNotifications.cancelAllLocalNotifications();
        }
    };

    onServerVersionChanged = async ({serverUrl, serverVersion}: {serverUrl: string; serverVersion?: string}) => {
        const match = serverVersion?.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g);
        const version = match && match[0];
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (version) {
            if (semver.valid(version) && semver.lt(version, LocalConfig.MinServerVersion)) {
                Alert.alert(
                    translations[t('mobile.server_upgrade.title')],
                    translations[t('mobile.server_upgrade.description')],
                    [{
                        text: translations[t('mobile.server_upgrade.button')],
                        onPress: () => this.serverUpgradeNeeded(serverUrl),
                    }],
                    {cancelable: false},
                );
            }

            fetchConfigAndLicense(serverUrl);
        }
    };

    resetLocale = async () => {
        if (Object.keys(DatabaseManager.serverDatabases).length) {
            const serverDatabase = await DatabaseManager.getActiveServerDatabase();
            const user = await queryCurrentUser(serverDatabase!);
            resetMomentLocale(user?.locale);
        } else {
            resetMomentLocale();
        }
    }

    serverUpgradeNeeded = async (serverUrl: string) => {
        const credentials = await getServerCredentials(serverUrl);

        if (credentials) {
            this.onLogout(serverUrl);
        }
    };
}

export default new GlobalEventHandler();
