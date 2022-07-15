// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeAllowedThemesKeys, observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import DisplaySettings from './display';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isTimezoneEnabled = observeConfigBooleanValue(database, 'ExperimentalTimezone');

    const allowsThemeSwitching = observeConfigBooleanValue(database, 'EnableThemeSelection');
    const allowedThemeKeys = observeAllowedThemesKeys(database);

    const isThemeSwitchingEnabled = combineLatest([allowsThemeSwitching, allowedThemeKeys]).pipe(
        switchMap(([ts, ath]) => {
            return of$(ts && ath.length > 1);
        }),
    );

    return {
        isTimezoneEnabled,
        isThemeSwitchingEnabled,
        hasMilitaryTimeFormat: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS).
            observeWithColumns(['value']).pipe(
                switchMap(
                    (preferences) => of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)),
                ),
            ),
        currentUser: observeCurrentUser(database),
    };
});

export default withDatabase(enhanced(DisplaySettings));
