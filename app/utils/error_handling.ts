// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';
import {setJSExceptionHandler, setNativeExceptionHandler} from 'react-native-exception-handler';

import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {dismissAllModals} from '@screens/navigation';
import {ClientError} from '@utils/client_error';
import {
    captureException,
    captureJSException,
    initializeSentry,
    LOGGER_NATIVE,
} from '@utils/sentry';

class JavascriptAndNativeErrorHandler {
    initializeErrorHandling = () => {
        initializeSentry();
        setJSExceptionHandler(this.errorHandler, false);
        setNativeExceptionHandler(this.nativeErrorHandler, false);
    };

    nativeErrorHandler = (e: string) => {
        // eslint-disable-next-line no-console
        console.warn('Handling native error ' + e);
        captureException(e, LOGGER_NATIVE);
    };

    errorHandler = (e: Error | ClientError, isFatal: boolean) => {
        if (__DEV__ && !e && !isFatal) {
            // react-native-exception-handler redirects console.error to call this, and React calls
            // console.error without an exception when prop type validation fails, so this ends up
            // being called with no arguments when the error handler is enabled in dev mode.
            return;
        }

        // eslint-disable-next-line no-console
        console.warn('Handling Javascript error', e, isFatal);
        captureJSException(e, isFatal);

        if (isFatal && e instanceof Error) {
            const translations = getTranslations(DEFAULT_LOCALE);

            Alert.alert(
                translations[t('mobile.error_handler.title')],
                translations[t('mobile.error_handler.description')] + `\n\n${e.message}\n\n${e.stack}`,
                [{
                    text: translations[t('mobile.error_handler.button')],
                    onPress: async () => {
                        await dismissAllModals();
                    },
                }],
                {cancelable: false},
            );
        }
    };
}

export default new JavascriptAndNativeErrorHandler();
