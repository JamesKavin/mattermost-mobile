// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchPostAuthors} from '@actions/remote/post';
import {ActionType, Post} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById, prepareDeletePost, queryPostsById} from '@queries/servers/post';
import {getCurrentUserId} from '@queries/servers/system';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {generateId} from '@utils/general';
import {logError} from '@utils/log';
import {getLastFetchedAtFromPosts} from '@utils/post';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import {updateLastPostAt, updateMyChannelLastFetchedAt} from './channel';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

export const sendAddToChannelEphemeralPost = async (serverUrl: string, user: UserModel, addedUsernames: string[], messages: string[], channeId: string, postRootId = '') => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const timestamp = Date.now();
        const posts = addedUsernames.map((addedUsername, index) => {
            const message = messages[index];
            return {
                id: generateId(),
                user_id: user.id,
                channel_id: channeId,
                message,
                type: Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL as PostType,
                create_at: timestamp,
                edit_at: 0,
                update_at: timestamp,
                delete_at: 0,
                is_pinned: false,
                original_id: '',
                hashtags: '',
                pending_post_id: '',
                reply_count: 0,
                metadata: {},
                root_id: postRootId,
                props: {
                    username: user.username,
                    addedUsername,
                },
            } as Post;
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: posts.map((p) => p.id),
            posts,
        });

        return {posts};
    } catch (error) {
        logError('Failed sendAddToChannelEphemeralPost', error);
        return {error};
    }
};

export const sendEphemeralPost = async (serverUrl: string, message: string, channeId: string, rootId = '', userId?: string) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!channeId) {
            throw new Error('channel Id not defined');
        }

        let authorId = userId;
        if (!authorId) {
            authorId = await getCurrentUserId(database);
        }

        const timestamp = Date.now();
        const post = {
            id: generateId(),
            user_id: authorId,
            channel_id: channeId,
            message,
            type: Post.POST_TYPES.EPHEMERAL as PostType,
            create_at: timestamp,
            edit_at: 0,
            update_at: timestamp,
            delete_at: 0,
            is_pinned: false,
            original_id: '',
            hashtags: '',
            pending_post_id: '',
            reply_count: 0,
            metadata: {},
            participants: null,
            root_id: rootId,
            props: {},
        } as Post;

        await fetchPostAuthors(serverUrl, [post], false);
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [post.id],
            posts: [post],
        });

        return {post};
    } catch (error) {
        logError('Failed sendEphemeralPost', error);
        return {error};
    }
};

export async function removePost(serverUrl: string, post: PostModel | Post) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
            const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
            const removeModels = [];
            for await (const id of systemPostIds) {
                const postModel = await getPostById(database, id);
                if (postModel) {
                    const preparedPost = await prepareDeletePost(postModel);
                    removeModels.push(...preparedPost);
                }
            }

            if (removeModels.length) {
                await operator.batchRecords(removeModels);
            }
        } else {
            const postModel = await getPostById(database, post.id);
            if (postModel) {
                const preparedPost = await prepareDeletePost(postModel);
                if (preparedPost.length) {
                    await operator.batchRecords(preparedPost);
                }
            }
        }

        return {post};
    } catch (error) {
        logError('Failed removePost', error);
        return {error};
    }
}

export async function markPostAsDeleted(serverUrl: string, post: Post, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const dbPost = await getPostById(database, post.id);
        if (!dbPost) {
            throw new Error('Post not found');
        }

        const model = dbPost.prepareUpdate((p) => {
            p.deleteAt = Date.now();
            p.message = '';
            p.metadata = null;
            p.props = undefined;
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([dbPost]);
        }
        return {model};
    } catch (error) {
        logError('Failed markPostAsDeleted', error);
        return {error};
    }
}

export async function storePostsForChannel(
    serverUrl: string, channelId: string, posts: Post[], order: string[], previousPostId: string,
    actionType: string, authors: UserProfile[], prepareRecordsOnly = false,
) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isCRTEnabled = await getIsCRTEnabled(database);

        const models = [];
        const postModels = await operator.handlePosts({
            actionType,
            order,
            posts,
            previousPostId,
            prepareRecordsOnly: true,
        });
        models.push(...postModels);

        if (authors.length) {
            const userModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
            models.push(...userModels);
        }

        const lastFetchedAt = getLastFetchedAtFromPosts(posts);
        let myChannelModel: MyChannelModel | undefined;
        if (lastFetchedAt) {
            const {member} = await updateMyChannelLastFetchedAt(serverUrl, channelId, lastFetchedAt, true);
            myChannelModel = member;
        }

        let lastPostAt = 0;
        for (const post of posts) {
            const isCrtReply = isCRTEnabled && post.root_id !== '';
            if (!isCrtReply) {
                lastPostAt = post.create_at > lastPostAt ? post.create_at : lastPostAt;
            }
        }

        if (lastPostAt) {
            const {member} = await updateLastPostAt(serverUrl, channelId, lastPostAt, true);
            if (member) {
                myChannelModel = member;
            }
        }

        if (myChannelModel) {
            models.push(myChannelModel);
        }

        if (isCRTEnabled) {
            const threadModels = await prepareThreadsFromReceivedPosts(operator, posts, false);
            if (threadModels?.length) {
                models.push(...threadModels);
            }
        }

        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models);
        }

        return {models};
    } catch (error) {
        logError('storePostsForChannel', error);
        return {error};
    }
}

export async function getPosts(serverUrl: string, ids: string[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return queryPostsById(database, ids).fetch();
    } catch (error) {
        return [];
    }
}
