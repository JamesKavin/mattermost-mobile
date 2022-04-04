// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getTranslations, t} from '@i18n';
import {getChannelById} from '@queries/servers/channel';
import {getPostById} from '@queries/servers/post';
import {getIsCRTEnabled, getThreadById, prepareThreadsFromReceivedPosts, queryThreadsInTeam} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {goToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {changeOpacity} from '@utils/theme';

import type Model from '@nozbe/watermelondb/Model';

export const switchToThread = async (serverUrl: string, rootId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const user = await getCurrentUser(database);
        if (!user) {
            return {error: 'User not found'};
        }

        const post = await getPostById(database, rootId);
        if (!post) {
            return {error: 'Post not found'};
        }
        const channel = await getChannelById(database, post.channelId);
        if (!channel) {
            return {error: 'Channel not found'};
        }

        const theme = EphemeralStore.theme;
        if (!theme) {
            return {error: 'Theme not found'};
        }

        // Modal right buttons
        const rightButtons = [];

        const isCRTEnabled = await getIsCRTEnabled(database);
        if (isCRTEnabled) {
            // CRT: Add follow/following button
            rightButtons.push({
                id: 'thread-follow-button',
                component: {
                    id: post.id,
                    name: Screens.THREAD_FOLLOW_BUTTON,
                    passProps: {
                        teamId: channel.teamId,
                        threadId: post.id,
                    },
                },
            });
        }

        // Get translation by user locale
        const translations = getTranslations(user.locale);

        // Get title translation or default title message
        let title = translations[t('thread.header.thread')] || 'Thread';
        if (channel.type === General.DM_CHANNEL) {
            title = translations[t('thread.header.thread_dm')] || 'Direct Message Thread';
        }

        let subtitle = '';
        if (channel?.type !== General.DM_CHANNEL) {
            // Get translation or default message
            subtitle = translations[t('thread.header.thread_in')] || 'in {channelName}';
            subtitle = subtitle.replace('{channelName}', channel.displayName);
        }

        goToScreen(Screens.THREAD, '', {rootId}, {
            topBar: {
                title: {
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
                rightButtons,
            },
        });
        return {};
    } catch (error) {
        return {error};
    }
};

// When new post arrives:
// 1. If a reply, then update the reply_count, add user as the participant
// 2. Else add the post as a thread
export const createThreadFromNewPost = async (serverUrl: string, post: Post, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];
    if (post.root_id) {
        // Update the thread data: `reply_count`
        const {model: threadModel} = await updateThread(serverUrl, post.root_id, {reply_count: post.reply_count}, true);
        if (threadModel) {
            models.push(threadModel);
        }

        // Add user as a participant to the thread
        const threadParticipantModels = await operator.handleThreadParticipants({
            threadsParticipants: [{
                thread_id: post.root_id,
                participants: [{
                    thread_id: post.root_id,
                    id: post.user_id,
                }],
            }],
            prepareRecordsOnly: true,
            skipSync: true,
        });
        if (threadParticipantModels?.length) {
            models.push(...threadParticipantModels);
        }
    } else { // If the post is a root post, then we need to add it to the thread table
        const threadModels = await prepareThreadsFromReceivedPosts(operator, [post]);
        if (threadModels?.length) {
            models.push(...threadModels);
        }
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
};

// On receiving threads, Along with the "threads" & "thread participants", extract and save "posts" & "users"
export const processReceivedThreads = async (serverUrl: string, threads: Thread[], teamId: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];

    const posts: Post[] = [];
    const users: UserProfile[] = [];

    // Extract posts & users from the received threads
    for (let i = 0; i < threads.length; i++) {
        const {participants, post} = threads[i];
        posts.push(post);
        participants.forEach((participant) => users.push(participant));
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
        order: [],
        posts,
        prepareRecordsOnly: true,
    });

    if (postModels.length) {
        models.push(...postModels);
    }

    const threadModels = await operator.handleThreads({
        threads,
        teamId,
        prepareRecordsOnly: true,
    });

    if (threadModels.length) {
        models.push(...threadModels);
    }

    const userModels = await operator.handleUsers({
        users,
        prepareRecordsOnly: true,
    });

    if (userModels.length) {
        models.push(...userModels);
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }
    return {models};
};

export const markTeamThreadsAsRead = async (serverUrl: string, teamId: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const {database} = operator;
        const threads = await queryThreadsInTeam(database, teamId, true).fetch();
        const models = threads.map((thread) => thread.prepareUpdate((record) => {
            record.unreadMentions = 0;
            record.unreadReplies = 0;
            record.lastViewedAt = Date.now();
        }));
        if (!prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
};

export const updateThread = async (serverUrl: string, threadId: string, updatedThread: Partial<Thread>, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await getThreadById(database, threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.isFollowing = updatedThread.is_following ?? record.isFollowing;
                record.replyCount = updatedThread.reply_count ?? record.replyCount;

                record.lastViewedAt = updatedThread.last_viewed_at ?? record.lastViewedAt;
                record.unreadMentions = updatedThread.unread_mentions ?? record.unreadMentions;
                record.unreadReplies = updatedThread.unread_replies ?? record.unreadReplies;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};
