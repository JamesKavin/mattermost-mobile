// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {View} from 'react-native';
import {map} from 'rxjs/operators';

import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    createAt: number | string | Date;
    isMilitaryTime: boolean;
    isTimezoneEnabled: boolean;
    theme: Theme;
    user: UserModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        displayName: {
            color: theme.centerChannelColor,
            flexGrow: 1,
            ...typography('Body', 200, 'SemiBold'),
        },
        displayNameContainer: {
            maxWidth: '60%',
            marginRight: 5,
        },
        header: {
            flex: 1,
            flexDirection: 'row',
        },
        time: {
            color: theme.centerChannelColor,
            marginTop: 5,
            opacity: 0.5,
            flex: 1,
            ...typography('Body', 75, 'Regular'),
        },
    };
});

const SystemHeader = ({isMilitaryTime, isTimezoneEnabled, createAt, theme, user}: Props) => {
    const styles = getStyleSheet(theme);
    const userTimezone = isTimezoneEnabled ? getUserTimezone(user) : '';

    return (
        <View style={styles.header}>
            <View style={styles.displayNameContainer}>
                <FormattedText
                    id='post_info.system'
                    defaultMessage='System'
                    style={styles.displayName}
                    testID='post_header.display_name'
                />
            </View>
            <FormattedTime
                timezone={userTimezone!}
                isMilitaryTime={isMilitaryTime}
                value={createAt}
                style={styles.time}
                testID='post_header.date_time'
            />
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const preferences = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time').
        observeWithColumns(['value']);
    const isTimezoneEnabled = observeConfigBooleanValue(database, 'ExperimentalTimezone');
    const isMilitaryTime = preferences.pipe(
        map((prefs) => getPreferenceAsBool(prefs, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time', false)),
    );
    const user = observeCurrentUser(database);

    return {
        isMilitaryTime,
        isTimezoneEnabled,
        user,
    };
});

export default withDatabase(enhanced(SystemHeader));
