// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareMissingChannelsForAllTeams} from '@queries/servers/channel';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {logError} from '@utils/log';

import {fetchPostAuthors, fetchMissingChannelsFromPosts} from './post';
import {forceLogoutIfNecessary} from './session';

import type Model from '@nozbe/watermelondb/Model';

export async function fetchRecentMentions(serverUrl: string): Promise<PostSearchRequest> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {
                posts: [],
                order: [],
            };
        }
        const terms = currentUser.userMentionKeys.map(({key}) => key).join(' ').trim() + ' ';
        const results = await searchPosts(serverUrl, '', {terms, is_or_search: true});
        if (results.error) {
            throw results.error;
        }

        const mentions: IdValue = {
            id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
            value: JSON.stringify(results.order),
        };

        await operator.handleSystem({
            systems: [mentions],
            prepareRecordsOnly: false,
        });

        return results;
    } catch (error) {
        return {error};
    }
}

export const searchPosts = async (serverUrl: string, teamId: string, params: PostSearchParams): Promise<PostSearchRequest> => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        let postsArray: Post[] = [];
        const data = await client.searchPosts(teamId, params.terms, params.is_or_search);

        const posts = data.posts || {};
        const order = data.order || [];

        const promises: Array<Promise<Model[]>> = [];
        postsArray = order.map((id) => posts[id]);
        if (postsArray.length) {
            const isCRTEnabled = await getIsCRTEnabled(operator.database);
            if (isCRTEnabled) {
                promises.push(prepareThreadsFromReceivedPosts(operator, postsArray, false));
            }

            const {authors} = await fetchPostAuthors(serverUrl, postsArray, true);
            const {channels, channelMemberships} = await fetchMissingChannelsFromPosts(serverUrl, postsArray, true);

            if (authors?.length) {
                promises.push(
                    operator.handleUsers({
                        users: authors,
                        prepareRecordsOnly: true,
                    }),
                );
            }

            if (channels?.length && channelMemberships?.length) {
                const channelPromises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships, isCRTEnabled);
                if (channelPromises.length) {
                    promises.push(...channelPromises);
                }
            }

            promises.push(
                operator.handlePosts({
                    actionType: '',
                    order: [],
                    posts: postsArray,
                    previousPostId: '',
                    prepareRecordsOnly: true,
                }),
            );
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models);
        return {
            order,
            posts: postsArray,
        };
    } catch (error) {
        logError('Failed: searchPosts', error);
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const searchFiles = async (serverUrl: string, teamId: string, params: FileSearchParams): Promise<{files?: FileInfo[]; channels?: string[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const result = await client.searchFiles(teamId, params.terms);
        const files = result?.file_infos ? Object.values(result.file_infos) : [];
        const allChannelIds = files.reduce<string[]>((acc, f) => {
            if (f.channel_id) {
                acc.push(f.channel_id);
            }
            return acc;
        }, []);
        const channels = [...new Set(allChannelIds)];
        return {files, channels};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
