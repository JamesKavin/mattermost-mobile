// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeGlobalThreadsTab} from '@queries/servers/system';

import GlobalThreads from './global_threads';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        globalThreadsTab: observeGlobalThreadsTab(database),
    };
});

export default withDatabase(enhanced(GlobalThreads));
