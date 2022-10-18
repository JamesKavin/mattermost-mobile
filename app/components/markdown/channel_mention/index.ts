// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

export type ChannelMentions = Record<string, {id?: string; display_name: string; name?: string; team_name: string}>;

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const channels = currentTeamId.pipe(
        switchMap((id) => queryAllChannelsForTeam(database, id).observeWithColumns(['display_name'])),
    );
    const team = currentTeamId.pipe(
        switchMap((id) => observeTeam(database, id)),
    );

    return {
        channels,
        currentTeamId,
        team,
    };
});

export default withDatabase(enhance(ChannelMention));
