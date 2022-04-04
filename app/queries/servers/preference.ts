// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {ServerDatabase} from '@typings/database/database';

import {getCurrentTeamId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {PREFERENCE}} = MM_TABLES;

export async function prepareMyPreferences(operator: ServerDataOperator, preferences: PreferenceType[], sync = false): Promise<PreferenceModel[]> {
    try {
        return operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences,
            sync,
        });
    } catch {
        return [];
    }
}

export const queryPreferencesByCategoryAndName = (database: Database, category: string, name?: string, value?: string) => {
    const clauses = [Q.where('category', category)];
    if (name != null) {
        clauses.push(Q.where('name', name));
    }
    if (value != null) {
        clauses.push(Q.where('value', value));
    }
    return database.get<PreferenceModel>(PREFERENCE).query(...clauses);
};

export const getThemeForCurrentTeam = async (database: Database) => {
    const currentTeamId = await getCurrentTeamId(database);
    const teamTheme = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME, currentTeamId).fetch();
    if (teamTheme.length) {
        try {
            return JSON.parse(teamTheme[0].value) as Theme;
        } catch {
            return undefined;
        }
    }

    return undefined;
};

export const deletePreferences = async (database: ServerDatabase, preferences: PreferenceType[]): Promise<Boolean> => {
    try {
        const preparedModels: Model[] = [];
        for await (const pref of preferences) {
            const myPrefs = await queryPreferencesByCategoryAndName(database.database, pref.category, pref.name).fetch();
            for (const p of myPrefs) {
                preparedModels.push(p.prepareDestroyPermanently());
            }
        }
        if (preparedModels.length) {
            await database.operator.batchRecords(preparedModels);
        }
        return true;
    } catch (error) {
        return false;
    }
};
