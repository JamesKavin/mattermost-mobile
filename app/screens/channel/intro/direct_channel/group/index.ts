// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {queryUsersById} from '@queries/servers/user';

import Group from './group';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({userIds, database}: {userIds: string[]} & WithDatabaseArgs) => ({
    users: queryUsersById(database, userIds).observeWithColumns(['last_picture_update']),
}));

export default withDatabase(enhanced(Group));
