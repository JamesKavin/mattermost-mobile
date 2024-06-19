// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import {openAuthSessionAsync} from 'expo-web-browser';
import qs from 'querystringify';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Linking, Platform, Text, View, type EventSubscription} from 'react-native';
import urlParse from 'url-parse';

import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import NetworkManager from '@managers/network_manager';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isBetaApp} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

interface SSOWithRedirectURLProps {
    doSSOLogin: (bearerToken: string, csrfToken: string) => void;
    loginError: string;
    loginUrl: string;
    serverUrl: string;
    setLoginError: (value: string) => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            marginTop: 25,
        },
        container: {
            flex: 1,
            paddingHorizontal: 24,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            textAlign: 'center',
            ...typography('Body', 200, 'Regular'),
        },
        infoContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        infoTitle: {
            color: theme.centerChannelColor,
            marginBottom: 4,
            ...typography('Heading', 700),
        },
    };
});

const SSOAuthentication = ({doSSOLogin, loginError, loginUrl, serverUrl, setLoginError, theme}: SSOWithRedirectURLProps) => {
    const [error, setError] = useState<string>('');
    const style = getStyleSheet(theme);
    const intl = useIntl();
    let customUrlScheme = Sso.REDIRECT_URL_SCHEME;
    if (isBetaApp) {
        customUrlScheme = Sso.REDIRECT_URL_SCHEME_DEV;
    }

    const redirectUrl = customUrlScheme + 'callback';
    const init = async (resetErrors = true) => {
        if (resetErrors !== false) {
            setError('');
            setLoginError('');
            NetworkManager.invalidateClient(serverUrl);
            NetworkManager.createClient(serverUrl);
        }
        const parsedUrl = urlParse(loginUrl, true);
        const query: Record<string, string> = {
            ...parsedUrl.query,
            redirect_to: redirectUrl,
        };
        parsedUrl.set('query', qs.stringify(query));
        const url = parsedUrl.toString();
        const result = await openAuthSessionAsync(url, null, {preferEphemeralSession: true});
        if ('url' in result && result.url) {
            const resultUrl = urlParse(result.url, true);
            const bearerToken = resultUrl.query?.MMAUTHTOKEN;
            const csrfToken = resultUrl.query?.MMCSRF;
            if (bearerToken && csrfToken) {
                doSSOLogin(bearerToken, csrfToken);
            }
        } else if (Platform.OS === 'ios' || result.type === 'dismiss') {
            setError(
                intl.formatMessage({
                    id: 'mobile.oauth.failed_to_login',
                    defaultMessage: 'Your login attempt failed. Please try again.',
                }),
            );
        }
    };

    useEffect(() => {
        let listener: EventSubscription | null = null;

        if (Platform.OS === 'android') {
            const onURLChange = ({url}: { url: string }) => {
                setError('');
                if (url && url.startsWith(redirectUrl)) {
                    const parsedUrl = urlParse(url, true);
                    const bearerToken = parsedUrl.query?.MMAUTHTOKEN;
                    const csrfToken = parsedUrl.query?.MMCSRF;
                    if (bearerToken && csrfToken) {
                        doSSOLogin(bearerToken, csrfToken);
                    } else {
                        setError(
                            intl.formatMessage({
                                id: 'mobile.oauth.failed_to_login',
                                defaultMessage: 'Your login attempt failed. Please try again.',
                            }),
                        );
                    }
                }
            };

            listener = Linking.addEventListener('url', onURLChange);
        }

        const timeout = setTimeout(() => {
            init(false);
        }, 1000);

        return () => {
            clearTimeout(timeout);
            listener?.remove();
        };
    }, []);

    return (
        <View
            style={style.container}
            testID='sso.redirect_url'
        >
            {loginError || error ? (
                <View style={style.infoContainer}>
                    <FormattedText
                        id='mobile.oauth.switch_to_browser.error_title'
                        testID='mobile.oauth.switch_to_browser.error_title'
                        defaultMessage='Sign in error'
                        style={style.infoTitle}
                    />
                    <Text style={style.errorText}>
                        {`${loginError || error}.`}
                    </Text>
                    <Button
                        buttonStyle={[style.button, buttonBackgroundStyle(theme, 'lg', 'primary', 'default')]}
                        testID='mobile.oauth.try_again'
                        onPress={() => init()}
                    >
                        <FormattedText
                            id='mobile.oauth.try_again'
                            defaultMessage='Try again'
                            style={buttonTextStyle(theme, 'lg', 'primary', 'default')}
                        />
                    </Button>
                </View>
            ) : (
                <View style={style.infoContainer}>
                    <FormattedText
                        id='mobile.oauth.switch_to_browser.title'
                        testID='mobile.oauth.switch_to_browser.title'
                        defaultMessage='Redirecting...'
                        style={style.infoTitle}
                    />
                    <FormattedText
                        id='mobile.oauth.switch_to_browser'
                        testID='mobile.oauth.switch_to_browser'
                        defaultMessage='You are being redirected to your login provider'
                        style={style.infoText}
                    />
                </View>
            )}
        </View>
    );
};

export default SSOAuthentication;
