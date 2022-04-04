// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markTeamThreadsAsRead, processReceivedThreads, updateThread} from '@actions/local/thread';
import DatabaseManager from '@database/manager';

export async function handleThreadUpdatedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    try {
        const thread = JSON.parse(msg.data.thread) as Thread;
        const teamId = msg.broadcast.team_id;

        // Mark it as following
        thread.is_following = true;
        processReceivedThreads(serverUrl, [thread], teamId);
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadReadChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return;
    }

    try {
        if (operator) {
            const {thread_id, timestamp, unread_mentions, unread_replies} = msg.data as ThreadReadChangedData;
            if (thread_id) {
                await updateThread(serverUrl, thread_id, {
                    last_viewed_at: timestamp,
                    unread_mentions,
                    unread_replies,
                });
            } else {
                await markTeamThreadsAsRead(serverUrl, msg.broadcast.team_id);
            }
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handleThreadFollowChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl].operator;
    if (!operator) {
        return;
    }

    try {
        if (operator) {
            const {reply_count, state, thread_id} = msg.data as {
                reply_count: number;
                state: boolean;
                thread_id: string;
            };
            await updateThread(serverUrl, thread_id, {
                is_following: state,
                reply_count,
            });
        }
    } catch (error) {
        // Do nothing
    }
}
