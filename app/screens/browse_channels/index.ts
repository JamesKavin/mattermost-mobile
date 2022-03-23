// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {queryAllMyChannel} from '@queries/servers/channel';
import {queryRolesByNames} from '@queries/servers/role';
import {observeConfig, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {hasPermission} from '@utils/role';

import SearchHandler from './search_handler';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);

    const sharedChannelsEnabled = config.pipe(
        switchMap((v) => of$(v?.ExperimentalSharedChannels === 'true')),
    );

    const canShowArchivedChannels = config.pipe(
        switchMap((v) => of$(v?.ExperimentalViewArchivedChannels === 'true')),
    );

    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);

    const joinedChannels = queryAllMyChannel(database).observe();

    const roles = currentUserId.pipe(
        switchMap((id) => observeUser(database, id)),
        switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
        switchMap((values) => queryRolesByNames(database, values).observe()),
    );

    const canCreateChannels = roles.pipe(switchMap((r) => of$(hasPermission(r, Permissions.CREATE_PUBLIC_CHANNEL, false))));

    return {
        canCreateChannels,
        currentUserId,
        currentTeamId,
        joinedChannels,
        sharedChannelsEnabled,
        canShowArchivedChannels,
    };
});

export default withDatabase(enhanced(SearchHandler));
