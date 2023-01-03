// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
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
import {Screens, Launch} from '@constants';
import {t} from '@i18n';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import {getServerByDisplayName, getServerByIdentifier} from '@queries/app/servers';
import Background from '@screens/background';
import {dismissModal, goToScreen, loginAnimationOptions} from '@screens/navigation';
import {getErrorMessage} from '@utils/client_error';
import {canReceiveNotifications} from '@utils/push_proxy';
import {loginOptions} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import ServerForm from './form';
import ServerHeader from './header';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

interface ServerProps extends LaunchProps {
    animated?: boolean;
    closeButtonId?: string;
    componentId: string;
    isModal?: boolean;
    theme: Theme;
}

let cancelPing: undefined | (() => void);

const defaultServerUrlMessage = {
    id: t('mobile.server_url.empty'),
    defaultMessage: 'Please enter a valid server URL',
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
        height: '90%',
        justifyContent: 'center',
    },
}));

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const Server = ({
    animated,
    closeButtonId,
    componentId,
    displayName: defaultDisplayName,
    extra,
    isModal,
    launchType,
    launchError,
    serverUrl: defaultServerUrl,
    theme,
}: ServerProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(animated ? dimensions.width : 0);
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const [connecting, setConnecting] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [url, setUrl] = useState<string>('');
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [urlError, setUrlError] = useState<string | undefined>();
    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;
    const disableServerUrl = Boolean(managedConfig?.allowOtherServers === 'false' && managedConfig?.serverUrl);
    const additionalServer = launchType === Launch.AddServerFromDeepLink || launchType === Launch.AddServer;

    useEffect(() => {
        let serverName: string | undefined = defaultDisplayName || managedConfig?.serverName || LocalConfig.DefaultServerName;
        let serverUrl: string | undefined = defaultServerUrl || managedConfig?.serverUrl || LocalConfig.DefaultServerUrl;
        let autoconnect = managedConfig?.allowOtherServers === 'false' || LocalConfig.AutoSelectServerUrl;

        if (launchType === Launch.DeepLink || launchType === Launch.AddServerFromDeepLink) {
            const deepLinkServerUrl = (extra as DeepLinkWithData).data?.serverUrl;
            if (managedConfig.serverUrl) {
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
        } else if (launchType === Launch.AddServer) {
            serverName = defaultDisplayName;
            serverUrl = defaultServerUrl;
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
    }, [managedConfig?.allowOtherServers, managedConfig?.serverUrl, managedConfig?.serverName]);

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

    useEffect(() => {
        const navigationEvents = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                NetworkManager.invalidateClient(url);
                dismissModal({componentId});
            }
        });

        PushNotifications.registerIfNeeded();

        return () => navigationEvents.remove();
    }, []);

    const displayLogin = (serverUrl: string, config: ClientConfig, license: ClientLicense) => {
        const {enabledSSOs, hasLoginForm, numberSSOs, ssoOptions} = loginOptions(config, license);
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

        if (displayNameError) {
            setDisplayNameError(undefined);
        }

        if (urlError) {
            setUrlError(undefined);
        }

        const server = await getServerByDisplayName(displayName);
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
        const result = await doPing(serverUrl, true, managedConfig?.timeout ? parseInt(managedConfig?.timeout, 10) : undefined);

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

        canReceiveNotifications(serverUrl, result.canReceiveNotifications as string, intl);
        const data = await fetchConfigAndLicense(serverUrl, true);
        if (data.error) {
            setButtonDisabled(true);
            setUrlError(getErrorMessage(data.error as ClientError, intl));
            setConnecting(false);
            return;
        }

        const server = await getServerByIdentifier(data.config!.DiagnosticId);
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
        <View
            style={styles.flex}
            testID='server.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'server_content'}
                style={[styles.flex, transform]}
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
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <ServerHeader
                        additionalServer={additionalServer}
                        theme={theme}
                    />
                    <ServerForm
                        autoFocus={additionalServer}
                        buttonDisabled={buttonDisabled}
                        connecting={connecting}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        disableServerUrl={disableServerUrl}
                        handleConnect={handleConnect}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handleUrlTextChanged={handleUrlTextChanged}
                        isModal={isModal}
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

export default Server;
