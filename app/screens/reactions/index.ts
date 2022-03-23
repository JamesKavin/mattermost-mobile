// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observePost} from '@queries/servers/post';

import Reactions from './reactions';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    postId: string;
}

const enhanced = withObservables([], ({postId, database}: EnhancedProps) => {
    const post = observePost(database, postId);

    return {
        reactions: post.pipe(
            switchMap((p) => (p ? p.reactions.observe() : of$(undefined))),
        ),
    };
});

export default withDatabase(enhanced(Reactions));

