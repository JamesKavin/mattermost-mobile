// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import {LaunchType} from '@typings/launch';

import SSOLogin from './index';

jest.mock('@screens/navigation', () => {
    return {
        getThemeFromState: () => 'light',
    };
});

jest.mock('@utils/url', () => {
    return {
        tryOpenURL: () => true,
    };
});

describe('SSO', () => {
    const baseProps = {
        license: {
            IsLicensed: 'true',
        },
        ssoType: 'GITLAB',
        theme: Preferences.THEMES.default,
        serverUrl: 'https://locahost:8065',
        launchType: LaunchType.Normal,
    };

    test('implement with webview when version is less than 5.32 version', async () => {
        const props = {...baseProps, config: {Version: '5.32.0'}};
        const {getByTestId} = renderWithIntl(<SSOLogin {...props}/>);
        expect(getByTestId('sso.webview')).toBeTruthy();
    });

    test('implement with OS browser & redirect url from version 5.33', async () => {
        const props = {...baseProps, config: {Version: '5.36.0'}};
        const {getByTestId} = renderWithIntl(<SSOLogin {...props}/>);
        expect(getByTestId('sso.redirect_url')).toBeTruthy();
    });
});
