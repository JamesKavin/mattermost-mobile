// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MAX_MESSAGE_LENGTH_FALLBACK} from '@constants/post_draft';
import {observeConfigIntValue} from '@queries/servers/system';

import EditPost from './edit_post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhance = withObservables([], ({database, post}: WithDatabaseArgs & { post: PostModel}) => {
    const maxPostSize = observeConfigIntValue(database, 'MaxPostSize', MAX_MESSAGE_LENGTH_FALLBACK);

    const hasFilesAttached = post.files.observe().pipe(switchMap((files) => of$(files?.length > 0)));

    return {
        maxPostSize,
        hasFilesAttached,
    };
});

export default withDatabase(enhance(EditPost));
