// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeExpandedLinks} from '@queries/servers/system';

import ImagePreview from './image_preview';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(['metadata'], ({database, metadata}: WithDatabaseArgs & {metadata: PostMetadata}) => {
    const link = metadata.embeds?.[0].url;

    return {
        expandedLink: observeExpandedLinks(database).pipe(
            switchMap((expandedLinks) => (
                link ? of$(expandedLinks[link]) : of$(undefined)),
            ),
        ),
        link: of$(link),
    };
});

export default withDatabase(enhance(ImagePreview));
