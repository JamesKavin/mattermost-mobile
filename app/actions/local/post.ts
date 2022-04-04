// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, Post} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById, prepareDeletePost} from '@queries/servers/post';
import {getCurrentUserId} from '@queries/servers/system';
import {generateId} from '@utils/general';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

export const sendAddToChannelEphemeralPost = async (serverUrl: string, user: UserModel, addedUsernames: string[], messages: string[], channeId: string, postRootId = '') => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

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
};

export const sendEphemeralPost = async (serverUrl: string, message: string, channeId: string, rootId = '', userId?: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    if (!channeId) {
        return {error: 'channel Id not defined'};
    }

    let authorId = userId;
    if (!authorId) {
        authorId = await getCurrentUserId(operator.database);
    }

    const timestamp = Date.now();
    const post = {
        id: generateId(),
        user_id: authorId,
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
        participants: null,
        root_id: rootId,
        props: {},
    } as Post;

    await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [post.id],
        posts: [post],
    });

    return {post};
};

export const removePost = async (serverUrl: string, post: PostModel | Post) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && post.props?.system_post_ids) {
        const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
        const removeModels = [];
        for await (const id of systemPostIds) {
            const postModel = await getPostById(operator.database, id);
            if (postModel) {
                const preparedPost = await prepareDeletePost(postModel);
                removeModels.push(...preparedPost);
            }
        }

        if (removeModels.length) {
            await operator.batchRecords(removeModels);
        }
    } else {
        const postModel = await getPostById(operator.database, post.id);
        if (postModel) {
            const preparedPost = await prepareDeletePost(postModel);
            if (preparedPost.length) {
                await operator.batchRecords(preparedPost);
            }
        }
    }

    return {post};
};

export const markPostAsDeleted = async (serverUrl: string, post: Post, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const dbPost = await getPostById(operator.database, post.id);
    if (!dbPost) {
        return {error: 'Post not found'};
    }

    const model = dbPost.prepareUpdate((p) => {
        p.deleteAt = Date.now();
        p.message = '';
        p.metadata = null;
        p.props = undefined;
    });

    if (!prepareRecordsOnly) {
        operator.batchRecords([dbPost]);
    }
    return {model};
};
