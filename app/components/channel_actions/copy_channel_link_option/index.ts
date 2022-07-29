// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import CopyChannelLinkOption from '@components/channel_actions/copy_channel_link_option/copy_channel_link_option';
import {observeChannel} from '@queries/servers/channel';
import {observeTeam} from '@queries/servers/team';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channel = observeChannel(database, channelId);
    const team = channel.pipe(
        switchMap((c) => (c?.teamId ? observeTeam(database, c.teamId) : of$(undefined))),
    );
    const teamName = team.pipe(
        switchMap((t) => of$(t?.name)),
    );

    const channelName = channel.pipe(
        switchMap((c) => of$(c?.name)),
    );
    return {
        channelName,
        teamName,
    };
});

export default withDatabase(enhanced(CopyChannelLinkOption));

