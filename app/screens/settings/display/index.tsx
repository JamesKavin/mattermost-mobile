// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeAllowedThemesKeys, observeConfigBooleanValue} from '@queries/servers/system';

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
    };
});

export default withDatabase(enhanced(DisplaySettings));
