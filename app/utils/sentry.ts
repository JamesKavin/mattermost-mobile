// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {Breadcrumb, Event} from '@sentry/types';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import Config from '@assets/config.json';
import DatabaseManager from '@database/manager';
import {getConfig} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {isBetaApp} from '@utils/general';

import {ClientError} from './client_error';
import {logError, logWarning} from './log';

export const BREADCRUMB_UNCAUGHT_APP_ERROR = 'uncaught-app-error';
export const BREADCRUMB_UNCAUGHT_NON_ERROR = 'uncaught-non-error';

let Sentry: any;
export function initializeSentry() {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!Sentry) {
        Sentry = require('@sentry/react-native');
    }

    const dsn = getDsn();

    if (!dsn) {
        logWarning('Sentry is enabled, but not configured on this platform');
        return;
    }

    const mmConfig = {
        environment: isBetaApp ? 'beta' : 'production',
        tracesSampleRate: isBetaApp ? 1.0 : 0.2,
        sampleRate: isBetaApp ? 1.0 : 0.2,
        attachStacktrace: isBetaApp, // For Beta, stack traces are automatically attached to all messages logged
    };

    Sentry.init({
        dsn,
        sendDefaultPii: false,
        ...mmConfig,
        ...Config.SentryOptions,
        integrations: [
            new Sentry.ReactNativeTracing({

                // Pass instrumentation to be used as `routingInstrumentation`
                routingInstrumentation: new Sentry.ReactNativeNavigationInstrumentation(
                    Navigation,
                ),
            }),
        ],
        beforeSend: (event: Event) => {
            if (isBetaApp || event?.level === 'fatal') {
                return event;
            }

            return null;
        },
    });
}

function getDsn() {
    if (Platform.OS === 'android') {
        return Config.SentryDsnAndroid;
    } else if (Platform.OS === 'ios') {
        return Config.SentryDsnIos;
    }

    return '';
}

export function captureException(error: Error | string) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureException called with missing arguments', error);
        return;
    }
    Sentry.captureException(error);
}

export function captureJSException(error: Error | ClientError, isFatal: boolean) {
    if (!Config.SentryEnabled) {
        return;
    }

    if (!error) {
        logWarning('captureJSException called with missing arguments', error);
        return;
    }

    if (error instanceof ClientError) {
        captureClientErrorAsBreadcrumb(error, isFatal);
    } else {
        captureException(error);
    }
}

function captureClientErrorAsBreadcrumb(error: ClientError, isFatal: boolean) {
    const isAppError = Boolean(error.server_error_id);
    const breadcrumb: Breadcrumb = {
        category: isAppError ? BREADCRUMB_UNCAUGHT_APP_ERROR : BREADCRUMB_UNCAUGHT_NON_ERROR,
        data: {
            isFatal: String(isFatal),
        },
        level: 'warning',
    };

    if (error.intl?.defaultMessage) {
        breadcrumb.message = error.intl.defaultMessage;
    } else {
        breadcrumb.message = error.message;
    }

    if (breadcrumb.data) {
        if (error.server_error_id) {
            breadcrumb.data.server_error_id = error.server_error_id;
        }

        if (error.status_code) {
            breadcrumb.data.status_code = error.status_code;
        }

        const match = (/^(?:https?:\/\/)[^/]+(\/.*)$/).exec(error.url);

        if (match && match.length >= 2) {
            breadcrumb.data.url = match[1];
        }
    }

    try {
        Sentry.addBreadcrumb(breadcrumb);
    } catch (e) {
        // Do nothing since this is only here to make sure we don't crash when handling an exception
        logWarning('Failed to capture breadcrumb of non-error', e);
    }
}

const getUserContext = async (database: Database) => {
    const currentUser = {
        id: 'currentUserId',
        locale: 'en',
        roles: 'multi-server-test-role',
    };

    const user = await getCurrentUser(database);

    return {
        userID: user?.id ?? currentUser.id,
        email: '',
        username: '',
        locale: user?.locale ?? currentUser.locale,
        roles: user?.roles ?? currentUser.roles,
    };
};

const getExtraContext = async (database: Database) => {
    const context = {
        config: {},
        currentChannel: {},
        currentTeam: {},
    };

    const config = await getConfig(database);
    if (config) {
        context.config = {
            BuildDate: config.BuildDate,
            BuildEnterpriseReady: config.BuildEnterpriseReady,
            BuildHash: config.BuildHash,
            BuildHashEnterprise: config.BuildHashEnterprise,
            BuildNumber: config.BuildNumber,
        };
    }

    return context;
};

const getBuildTags = async (database: Database) => {
    const tags = {
        serverBuildHash: '',
        serverBuildNumber: '',
    };

    const config = await getConfig(database);
    if (config) {
        tags.serverBuildHash = config.BuildHash;
        tags.serverBuildNumber = config.BuildNumber;
    }

    return tags;
};

export const addSentryContext = async (serverUrl: string) => {
    if (!Config.SentryEnabled || !Sentry) {
        return;
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userContext = await getUserContext(database);
        Sentry.setContext('User-Information', userContext);

        const buildContext = await getBuildTags(database);
        Sentry.setContext('App-Build Information', buildContext);

        const extraContext = await getExtraContext(database);
        Sentry.setContext('Server-Information', extraContext);
    } catch (e) {
        logError(`addSentryContext for serverUrl ${serverUrl}`, e);
    }
};
