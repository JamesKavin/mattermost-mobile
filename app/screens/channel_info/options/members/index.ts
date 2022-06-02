// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelInfo} from '@queries/servers/channel';

import Members from './members';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const info = observeChannelInfo(database, channelId);
    const count = info.pipe(
        switchMap((i) => of$(i?.memberCount || 0)),
    );

    return {
        count,
    };
});

export default withDatabase(enhanced(Members));
