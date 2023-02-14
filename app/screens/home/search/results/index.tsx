// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryChannelsById} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeConfigBooleanValue, observeCanDownloadFiles} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import Results from './results';

import type {WithDatabaseArgs} from '@typings/database/database';

type enhancedProps = WithDatabaseArgs & {
    fileChannelIds: string[];
}

const enhance = withObservables(['fileChannelIds'], ({database, fileChannelIds}: enhancedProps) => {
    const fileChannels = queryChannelsById(database, fileChannelIds).observeWithColumns(['displayName']);
    const currentUser = observeCurrentUser(database);

    return {
        appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone))))),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        fileChannels,
        canDownloadFiles: observeCanDownloadFiles(database),
        publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(Results);
