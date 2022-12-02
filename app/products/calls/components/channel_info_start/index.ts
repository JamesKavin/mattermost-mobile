// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import ChannelInfoStartButton from '@calls/components/channel_info_start/channel_info_start_button';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {observeChannelsWithCalls, observeCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {isDMorGM} from '@utils/channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
    channelId: string;
}

const enhanced = withObservables([], ({serverUrl, channelId, database}: EnhanceProps) => {
    const channel = observeChannel(database, channelId);
    const displayName = channel.pipe(
        switchMap((c) => of$(c?.displayName || '')),
        distinctUntilChanged(),
    );
    const channelIsDMorGM = channel.pipe(
        switchMap((chan) => of$(chan ? isDMorGM(chan) : false)),
        distinctUntilChanged(),
    );
    const isACallInCurrentChannel = observeChannelsWithCalls(serverUrl).pipe(
        switchMap((calls) => of$(Boolean(calls[channelId]))),
        distinctUntilChanged(),
    );
    const ccDatabase = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.serverUrl || '')),
        distinctUntilChanged(),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const ccChannelId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.channelId)),
        distinctUntilChanged(),
    );
    const confirmToJoin = ccChannelId.pipe(switchMap((ccId) => of$(ccId && ccId !== channelId)));
    const alreadyInCall = ccChannelId.pipe(switchMap((ccId) => of$(ccId && ccId === channelId)));
    const currentCallChannelName = combineLatest([ccDatabase, ccChannelId]).pipe(
        switchMap(([db, id]) => (db && id ? observeChannel(db, id) : of$(undefined))),
        switchMap((c) => of$(c?.displayName || '')),
        distinctUntilChanged(),
    );

    return {
        displayName,
        channelIsDMorGM,
        isACallInCurrentChannel,
        confirmToJoin,
        alreadyInCall,
        currentCallChannelName,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, channelId),
    };
});

export default withDatabase(enhanced(ChannelInfoStartButton));
