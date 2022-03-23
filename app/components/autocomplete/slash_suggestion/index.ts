// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue, observeCurrentChannelId} from '@queries/servers/system';

import SlashSuggestion from './slash_suggestion';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentTeamId: observeCurrentChannelId(database),
    isAppsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
}));

export default withDatabase(enhanced(SlashSuggestion));
