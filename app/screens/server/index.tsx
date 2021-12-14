// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig, ManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, useWindowDimensions, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import LocalConfig from '@assets/config.json';
import ClientError from '@client/rest/error';
import AppVersion from '@components/app_version';
import {Screens, Sso} from '@constants';
import DatabaseManager from '@database/manager';
import {t} from '@i18n';
import NetworkManager from '@init/network_manager';
import {queryServerByDisplayName, queryServerByIdentifier} from '@queries/app/servers';
import Background from '@screens/background';
import {goToScreen, loginAnimationOptions} from '@screens/navigation';
import {DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {getErrorMessage} from '@utils/client_error';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import ServerForm from './form';
import ServerHeader from './header';

interface ServerProps extends LaunchProps {
    componentId: string;
    theme: Theme;
}

let cancelPing: undefined | (() => void);

const defaultServerUrlMessage = {
    id: t('mobile.server_url.empty'),
    defaultMessage: 'Please enter a valid server URL',
};

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const Server = ({componentId, extra, launchType, launchError, theme}: ServerProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(0);
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>();
    const [connecting, setConnecting] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [url, setUrl] = useState<string>('');
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [urlError, setUrlError] = useState<string | undefined>();
    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;

    useEffect(() => {
        const serverName = managedConfig?.serverName || LocalConfig.DefaultServerName;
        let serverUrl = managedConfig?.serverUrl || LocalConfig.DefaultServerUrl;
        let autoconnect = managedConfig?.allowOtherServers === 'false' || LocalConfig.AutoSelectServerUrl;

        if (launchType === LaunchType.DeepLink) {
            const deepLinkServerUrl = (extra as DeepLinkWithData).data?.serverUrl;
            if (managedConfig) {
                autoconnect = (managedConfig.allowOtherServers === 'false' && managedConfig.serverUrl === deepLinkServerUrl);
                if (managedConfig.serverUrl !== deepLinkServerUrl || launchError) {
                    Alert.alert('', intl.formatMessage({
                        id: 'mobile.server_url.deeplink.emm.denied',
                        defaultMessage: 'This app is controlled by an EMM and the DeepLink server url does not match the EMM allowed server',
                    }));
                }
            } else {
                autoconnect = true;
                serverUrl = deepLinkServerUrl;
            }
        }

        if (serverUrl) {
            // If a server Url is set by the managed or local configuration, use it.
            setUrl(serverUrl);
        }

        if (serverName) {
            setDisplayName(serverName);
        }

        if (serverUrl && serverName && autoconnect) {
            // If no other servers are allowed or the local config for AutoSelectServerUrl is set, attempt to connect
            handleConnect(managedConfig?.serverUrl || LocalConfig.DefaultServerUrl);
        }
    }, []);

    useEffect(() => {
        if (url && displayName) {
            setButtonDisabled(false);
        } else {
            setButtonDisabled(true);
        }
    }, [url, displayName]);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
                if (url) {
                    NetworkManager.invalidateClient(url);
                }
            },
            componentDidDisappear: () => {
                translateX.value = -dimensions.width;
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);

        return () => unsubscribe.remove();
    }, [componentId, url, dimensions]);

    const displayLogin = (serverUrl: string, config: ClientConfig, license: ClientLicense) => {
        const isLicensed = license.IsLicensed === 'true';
        const samlEnabled = config.EnableSaml === 'true' && isLicensed && license.SAML === 'true';
        const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';
        const googleEnabled = config.EnableSignUpWithGoogle === 'true' && isLicensed;
        const o365Enabled = config.EnableSignUpWithOffice365 === 'true' && isLicensed && license.Office365OAuth === 'true';
        const openIdEnabled = config.EnableSignUpWithOpenId === 'true' && isLicensed;
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

        const passProps = {
            config,
            extra,
            hasLoginForm,
            launchError,
            launchType,
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
            passProps.ssoType = enabledSSOs[0];
        }

        goToScreen(screen, '', passProps, loginAnimationOptions());
        setConnecting(false);
        setButtonDisabled(false);
        setUrl(serverUrl);
    };

    const handleConnect = async (manualUrl?: string) => {
        if (buttonDisabled && !manualUrl) {
            return;
        }

        if (connecting && cancelPing) {
            cancelPing();
            return;
        }

        const serverUrl = typeof manualUrl === 'string' ? manualUrl : url;
        if (!serverUrl || serverUrl.trim() === '') {
            setUrlError(formatMessage(defaultServerUrlMessage));
            return;
        }

        if (!isServerUrlValid(serverUrl)) {
            return;
        }

        const server = await queryServerByDisplayName(DatabaseManager.appDatabase!.database, displayName);
        if (server && server.lastActiveAt > 0) {
            setButtonDisabled(true);
            setDisplayNameError(formatMessage({
                id: 'mobile.server_name.exists',
                defaultMessage: 'You are using this name for another server.',
            }));
            setConnecting(false);
            return;
        }

        pingServer(serverUrl);
    };

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    const handleUrlTextChanged = useCallback((text: string) => {
        setUrlError(undefined);
        setUrl(text);
    }, []);

    const isServerUrlValid = (serverUrl?: string) => {
        const testUrl = sanitizeUrl(serverUrl ?? url);
        if (!isValidUrl(testUrl)) {
            setUrlError(intl.formatMessage({
                id: 'mobile.server_url.invalid_format',
                defaultMessage: 'URL must start with http:// or https://',
            }));
            return false;
        }
        return true;
    };

    const pingServer = async (pingUrl: string, retryWithHttp = true) => {
        let canceled = false;
        setConnecting(true);
        cancelPing = () => {
            canceled = true;
            setConnecting(false);
            cancelPing = undefined;
        };

        const serverUrl = await getServerUrlAfterRedirect(pingUrl, !retryWithHttp);
        const result = await doPing(serverUrl);

        if (canceled) {
            return;
        }

        if (result.error) {
            if (retryWithHttp) {
                const nurl = serverUrl.replace('https:', 'http:');
                pingServer(nurl, false);
            } else {
                setUrlError(getErrorMessage(result.error as ClientError, intl));
                setButtonDisabled(true);
                setConnecting(false);
            }
            return;
        }

        const data = await fetchConfigAndLicense(serverUrl, true);
        if (data.error) {
            setButtonDisabled(true);
            setUrlError(getErrorMessage(data.error as ClientError, intl));
            setConnecting(false);
            return;
        }

        const server = await queryServerByIdentifier(DatabaseManager.appDatabase!.database, data.config!.DiagnosticId);
        setConnecting(false);

        if (server && server.lastActiveAt > 0) {
            setButtonDisabled(true);
            setUrlError(formatMessage({
                id: 'mobile.server_identifier.exists',
                defaultMessage: 'You are already connected to this server.',
            }));
            return;
        }

        displayLogin(serverUrl, data.config!, data.license!);
    };

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'server_content'}
                style={[styles.flex, transform]}
                testID='select_server.screen'
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    enableAutomaticScroll={Platform.OS === 'android'}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={20}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'

                    // @ts-expect-error legacy ref
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <ServerHeader theme={theme}/>
                    <ServerForm
                        buttonDisabled={buttonDisabled}
                        connecting={connecting}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        handleConnect={handleConnect}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handleUrlTextChanged={handleUrlTextChanged}
                        keyboardAwareRef={keyboardAwareRef}
                        theme={theme}
                        url={url}
                        urlError={urlError}
                    />
                </KeyboardAwareScrollView>
                <AppVersion textStyle={styles.appInfo}/>
            </AnimatedSafeArea>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

export default Server;
