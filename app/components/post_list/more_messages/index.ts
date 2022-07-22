// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, first as first$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel} from '@queries/servers/channel';
import {observeThreadById} from '@queries/servers/thread';

import MoreMessages from './more_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    channelId: string;
    isCRTEnabled?: boolean;
    rootId?: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['channelId', 'isCRTEnabled', 'rootId'], ({channelId, isCRTEnabled, rootId, database}: Props) => {
    if (isCRTEnabled && rootId) {
        const thread = observeThreadById(database, rootId);

        // Just take the first value emited as we set unreadReplies to 0 on viewing the thread.
        const unreadCount = thread.pipe(first$(), switchMap((th) => of$(th?.unreadReplies)));
        return {
            unreadCount,
        };
    }

    const myChannel = observeMyChannel(database, channelId);
    const isManualUnread = myChannel.pipe(switchMap((ch) => of$(ch?.manuallyUnread)));
    const unreadCount = myChannel.pipe(switchMap((ch) => of$(ch?.messageCount)));

    return {
        isManualUnread,
        unreadCount,
    };
});

export default withDatabase(enhanced(MoreMessages));
