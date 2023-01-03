// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert, AlertButton} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Screens, Sso, SupportedServer, Launch} from '@constants';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {getErrorMessage} from '@utils/client_error';
import {isMinimumServerVersion} from '@utils/helpers';
import {changeOpacity} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import type ServersModel from '@typings/database/models/app/servers';
import type {DeepLinkWithData} from '@typings/launch';

export function isSupportedServer(currentVersion: string) {
    return isMinimumServerVersion(currentVersion, SupportedServer.MAJOR_VERSION, SupportedServer.MIN_VERSION, SupportedServer.PATCH_VERSION);
}

export function unsupportedServer(serverDisplayName: string, isSystemAdmin: boolean, intl: IntlShape, onPress?: () => void) {
    if (isSystemAdmin) {
        return unsupportedServerAdminAlert(serverDisplayName, intl, onPress);
    }
    return unsupportedServerAlert(serverDisplayName, intl, onPress);
}

export function semverFromServerVersion(value: string) {
    if (!value || typeof value !== 'string') {
        return undefined;
    }

    const split = value.split('.');

    const major = parseInt(split[0], 10);
    const minor = parseInt(split[1] || '0', 10);
    const patch = parseInt(split[2] || '0', 10);

    return `${major}.${minor}.${patch}`;
}

export async function addNewServer(theme: Theme, serverUrl?: string, displayName?: string, deepLinkProps?: DeepLinkWithData) {
    await dismissBottomSheet();
    const closeButtonId = 'close-server';
    const props = {
        closeButtonId,
        displayName,
        launchType: deepLinkProps ? Launch.AddServerFromDeepLink : Launch.AddServer,
        serverUrl,
        theme,
        extra: deepLinkProps,
    };
    const options = buildServerModalOptions(theme, closeButtonId);

    showModal(Screens.SERVER, '', props, options);
}

export function loginOptions(config: ClientConfig, license: ClientLicense) {
    const isLicensed = license.IsLicensed === 'true';
    const samlEnabled = config.EnableSaml === 'true' && isLicensed && license.SAML === 'true';
    const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';
    const isMinServerVersionForFreeOAuth = isMinimumServerVersion(config.Version, 7, 6);
    let googleEnabled = false;
    let o365Enabled = false;
    let openIdEnabled = false;
    if (isMinServerVersionForFreeOAuth) {
        googleEnabled = config.EnableSignUpWithGoogle === 'true';
        o365Enabled = config.EnableSignUpWithOffice365 === 'true';
        openIdEnabled = config.EnableSignUpWithOpenId === 'true';
    } else {
        googleEnabled = config.EnableSignUpWithGoogle === 'true' && isLicensed;
        o365Enabled = config.EnableSignUpWithOffice365 === 'true' && isLicensed && license.Office365OAuth === 'true';
        openIdEnabled = config.EnableSignUpWithOpenId === 'true' && isLicensed;
    }
    const ldapEnabled = isLicensed && config.EnableLdap === 'true' && license.LDAP === 'true';
    const hasLoginForm = config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true' || ldapEnabled;
    const ssoOptions: Record<string, boolean> = {
        [Sso.SAML]: samlEnabled,
        [Sso.GITLAB]: gitlabEnabled,
        [Sso.GOOGLE]: googleEnabled,
        [Sso.OFFICE365]: o365Enabled,
        [Sso.OPENID]: openIdEnabled,
    };
    const enabledSSOs = Object.keys(ssoOptions).filter((key) => ssoOptions[key]);
    const numberSSOs = enabledSSOs.length;

    return {
        enabledSSOs,
        hasLoginForm,
        numberSSOs,
        ssoOptions,
    };
}

export async function loginToServer(theme: Theme, serverUrl: string, displayName: string, config: ClientConfig, license: ClientLicense) {
    await dismissBottomSheet();
    const closeButtonId = 'close-server';
    const {enabledSSOs, hasLoginForm, numberSSOs, ssoOptions} = loginOptions(config, license);
    const props = {
        closeButtonId,
        config,
        hasLoginForm,
        launchType: Launch.AddServer,
        license,
        serverDisplayName: displayName,
        serverUrl,
        ssoOptions,
        theme,
    };

    const redirectSSO = !hasLoginForm && numberSSOs === 1;
    const screen = redirectSSO ? Screens.SSO : Screens.LOGIN;
    if (redirectSSO) {
        // @ts-expect-error ssoType not in definition
        props.ssoType = enabledSSOs[0];
    }

    const options = buildServerModalOptions(theme, closeButtonId);

    showModal(screen, '', props, options);
}

export async function editServer(theme: Theme, server: ServersModel) {
    const closeButtonId = 'close-server-edit';
    const props = {
        closeButtonId,
        server,
        theme,
    };
    const options = buildServerModalOptions(theme, closeButtonId);

    showModal(Screens.EDIT_SERVER, '', props, options);
}

export async function alertServerLogout(displayName: string, onPress: () => void, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'server.logout.alert_title',
            defaultMessage: 'Are you sure you want to log out of {displayName}?',
        }, {displayName}),
        intl.formatMessage({
            id: 'server.logout.alert_description',
            defaultMessage: 'All associated data will be removed',
        }),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
        }, {
            style: 'destructive',
            text: intl.formatMessage({id: 'servers.logout', defaultMessage: 'Log out'}),
            onPress,
        }],
    );
}

export async function alertServerRemove(displayName: string, onPress: () => void, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'server.remove.alert_title',
            defaultMessage: 'Are you sure you want to remove {displayName}?',
        }, {displayName}),
        intl.formatMessage({
            id: 'server.remove.alert_description',
            defaultMessage: 'This will remove it from your list of servers. All associated data will be removed',
        }),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
        }, {
            style: 'destructive',
            text: intl.formatMessage({id: 'servers.remove', defaultMessage: 'Remove'}),
            onPress,
        }],
    );
}

export function alertServerError(intl: IntlShape, error: ClientErrorProps) {
    const message = getErrorMessage(error, intl);
    Alert.alert(
        intl.formatMessage({
            id: 'server.websocket.unreachable',
            defaultMessage: 'Server is unreachable.',
        }),
        message,
    );
}

export function alertServerAlreadyConnected(intl: IntlShape) {
    Alert.alert(
        '',
        intl.formatMessage({
            id: 'mobile.server_identifier.exists',
            defaultMessage: 'You are already connected to this server.',
        }),
    );
}

export const sortServersByDisplayName = (servers: ServersModel[], intl: IntlShape) => {
    function serverName(s: ServersModel) {
        if (s.displayName === s.url) {
            return intl.formatMessage({id: 'servers.default', defaultMessage: 'Default Server'});
        }

        return s.displayName;
    }

    return servers.sort((a, b) => {
        return serverName(a).localeCompare(serverName(b));
    });
};

function unsupportedServerAdminAlert(serverDisplayName: string, intl: IntlShape, onPress?: () => void) {
    const title = intl.formatMessage({id: 'mobile.server_upgrade.title', defaultMessage: 'Server upgrade required'});

    const message = intl.formatMessage({
        id: 'server_upgrade.alert_description',
        defaultMessage: 'Your server, {serverDisplayName}, is running an unsupported server version. Users will be exposed to compatibility issues that cause crashes or severe bugs breaking core functionality of the app. Upgrading to server version {supportedServerVersion} or later is required.',
    }, {serverDisplayName, supportedServerVersion: SupportedServer.FULL_VERSION});

    const cancel: AlertButton = {
        text: intl.formatMessage({id: 'server_upgrade.dismiss', defaultMessage: 'Dismiss'}),
        style: 'default',
        onPress,
    };

    const learnMore: AlertButton = {
        text: intl.formatMessage({id: 'server_upgrade.learn_more', defaultMessage: 'Learn More'}),
        style: 'cancel',
        onPress: () => {
            const url = 'https://docs.mattermost.com/administration/release-lifecycle.html';
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'mobile.link.error.text', defaultMessage: 'Unable to open the link.'}),
                );
            };

            tryOpenURL(url, onError);
        },
    };
    const buttons: AlertButton[] = [cancel, learnMore];
    const options = {cancelable: false};

    Alert.alert(title, message, buttons, options);
}

function unsupportedServerAlert(serverDisplayName: string, intl: IntlShape, onPress?: () => void) {
    const title = intl.formatMessage({id: 'unsupported_server.title', defaultMessage: 'Unsupported server version'});

    const message = intl.formatMessage({
        id: 'unsupported_server.message',
        defaultMessage: 'Your server, {serverDisplayName}, is running an unsupported server version. You may experience compatibility issues that cause crashes or severe bugs breaking core functionality of the app. Please contact your System Administrator to upgrade your Mattermost server.',
    }, {serverDisplayName});

    const okButton: AlertButton = {
        text: intl.formatMessage({id: 'mobile.server_upgrade.button', defaultMessage: 'OK'}),
        style: 'default',
        onPress,
    };

    const buttons: AlertButton[] = [okButton];
    const options = {cancelable: false};

    Alert.alert(title, message, buttons, options);
}

function buildServerModalOptions(theme: Theme, closeButtonId: string) {
    const closeButton = CompassIcon.getImageSourceSync('close', 24, changeOpacity(theme.centerChannelColor, 0.56));
    const closeButtonTestId = `${closeButtonId.replace('close-', 'close.').replace(/-/g, '_')}.button`;
    return {
        layout: {
            backgroundColor: theme.centerChannelBg,
            componentBackgroundColor: theme.centerChannelBg,
        },
        topBar: {
            visible: true,
            drawBehind: true,
            translucient: true,
            noBorder: true,
            elevation: 0,
            background: {color: 'transparent'},
            leftButtons: [{
                id: closeButtonId,
                icon: closeButton,
                testID: closeButtonTestId,
            }],
            leftButtonColor: undefined,
            title: {color: theme.sidebarHeaderTextColor},
            scrollEdgeAppearance: {
                active: true,
                noBorder: true,
                translucid: true,
            },
        },
    };
}
