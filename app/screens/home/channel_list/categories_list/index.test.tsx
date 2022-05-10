// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import ServerDataOperator from '@database/operator/server_data_operator';
import {getTeamById} from '@queries/servers/team';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CategoriesList from '.';

describe('components/categories_list', () => {
    let database: Database;
    let operator: ServerDataOperator;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        operator = server.operator;

        const team = await getTeamById(database, TestHelper.basicTeam!.id);
        await database.write(async () => {
            await team?.update(() => {
                team.displayName = 'Test Team!';
            });
        });
    });

    it('should render', () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isTablet={false}
                teamsCount={1}
                channelsCount={1}
            />,
            {database},
        );
        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('should render channel list with thread menu', () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isCRTEnabled={true}
                isTablet={false}
                teamsCount={1}
                channelsCount={1}
            />,
            {database},
        );
        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('should render team error', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: ''}],
            prepareRecordsOnly: false,
        });

        const wrapper = renderWithEverything(
            <CategoriesList
                isTablet={false}
                teamsCount={0}
                channelsCount={1}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: TestHelper.basicTeam!.id}],
            prepareRecordsOnly: false,
        });
    });

    it('should render channels error', () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isTablet={false}
                teamsCount={1}
                channelsCount={0}
            />,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
