// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';

import ErrorTextComponent from './index';

describe('ErrorText', () => {
    const baseProps = {
        testID: 'error.text',
        textStyle: {
            fontSize: 14,
            marginHorizontal: 15,
        },
        theme: Preferences.THEMES.denim,
        error: 'Username must begin with a letter and contain between 3 and 22 characters including numbers, lowercase letters, and the symbols',
    };

    test('should match snapshot', () => {
        const wrapper = render(
            <ErrorTextComponent {...baseProps}/>,
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
