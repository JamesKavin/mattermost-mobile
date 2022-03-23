// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPostById, queryPostsInChannel} from '@queries/servers/post';

export const updatePostSinceCache = async (serverUrl: string, notification: NotificationWithData) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        if (notification.payload?.channel_id) {
            const {database} = operator;
            const chunks = await queryPostsInChannel(database, notification.payload.channel_id).fetch();
            if (chunks.length) {
                const recent = chunks[0];
                const lastPost = await getPostById(database, notification.payload.post_id);
                if (lastPost) {
                    await operator.database.write(async () => {
                        await recent.update(() => {
                            recent.latest = lastPost.createAt;
                        });
                    });
                }
            }
        }
        return {};
    } catch (error) {
        return {error};
    }
};

