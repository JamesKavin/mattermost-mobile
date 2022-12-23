// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePost} from '@queries/servers/post';
import {observeCurrentTeamId} from '@queries/servers/system';
import {queryMyTeamsByIds, queryTeamByName} from '@queries/servers/team';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import Permalink from './permalink';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type OwnProps = {
    postId: PostModel['id'];
    teamName?: string;
} & WithDatabaseArgs;

const enhance = withObservables([], ({database, postId, teamName}: OwnProps) => {
    const post = observePost(database, postId);
    const team = teamName ? queryTeamByName(database, teamName).observe().pipe(
        switchMap((ts) => {
            const t = ts[0];
            return t ? t.observe() : of$(undefined);
        }),
    ) : of$(undefined);

    return {
        channel: post.pipe(
            switchMap((p) => (p ? p.channel.observe() : of$(undefined))),
        ),
        rootId: post.pipe(
            switchMap((p) => of$(p?.rootId)),
        ),
        isTeamMember: team.pipe(
            switchMap((t) => (t ? queryMyTeamsByIds(database, [t.id]).observe() : of$(undefined))),
            switchMap((ms) => of$(Boolean(ms?.[0]))),
        ),
        currentTeamId: observeCurrentTeamId(database),
        isCRTEnabled: observeIsCRTEnabled(database),
    };
});

export default withDatabase(enhance(Permalink));
