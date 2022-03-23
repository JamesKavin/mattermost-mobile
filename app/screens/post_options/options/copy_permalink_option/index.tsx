// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';

import CopyPermalinkOption from './copy_permalink_option';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';

const enhanced = withObservables(['post'], ({post, database}: WithDatabaseArgs & { post: PostModel }) => {
    const currentTeamId = observeCurrentTeamId(database);
    const channel = post.channel.observe();

    const teamName = combineLatest([channel, currentTeamId]).pipe(
        switchMap(([c, tid]) => {
            const teamId = c?.teamId || tid;
            return observeTeam(database, teamId).
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((team: TeamModel) => of$(team.name)),
                );
        }),
    );

    return {
        teamName,
    };
});

export default withDatabase(enhanced(CopyPermalinkOption));
