// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Threads from './threads_button';

const baseProps = {
    currentChannelId: 'someChannelId',
    groupUnreadsSeparately: true,
    onlyUnreads: false,
    unreadsAndMentions: {
        unreads: false,
        mentions: 0,
    },
};

describe('Thread item in the channel list', () => {
    test('Threads Component should match snapshot', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads {...baseProps}/>,
        );
        expect(toJSON()).toMatchSnapshot();
    });

    test('Threads Component should match snapshot with only unreads filter', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                {...baseProps}
                onlyUnreads={true}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });

    test('Threads Component should match snapshot with isInfo', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                {...baseProps}
                isInfo={true}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });

    test('Threads Component should match snapshot, groupUnreadsSeparately false, always show', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <Threads
                {...baseProps}
                groupUnreadsSeparately={false}
                onlyUnreads={true}
            />,
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
