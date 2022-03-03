// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Query, Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadParticipantModel from '@typings/database/models/servers/thread_participant';

const {POST, THREAD, THREAD_PARTICIPANT} = MM_TABLES.SERVER;

/**
 * The Thread model contains thread information of a post.
 */
export default class ThreadModel extends Model {
    /** table (name) : Thread */
    static table = THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A THREAD is associated to one POST (relationship is 1:1) */
        [POST]: {type: 'belongs_to', key: 'id'},

        /** A THREAD can have multiple THREAD_PARTICIPANT. (relationship is 1:N)*/
        [THREAD_PARTICIPANT]: {type: 'has_many', foreignKey: 'thread_id'},
    };

    /** last_reply_at : The timestamp of when user last replied to the thread. */
    @field('last_reply_at') lastReplyAt!: number;

    /** last_viewed_at : The timestamp of when user last viewed the thread. */
    @field('last_viewed_at') lastViewedAt!: number;

    /** reply_count : The total replies to the thread by all the participants. */
    @field('reply_count') replyCount!: number;

    /** is_following: If user is following the thread or not */
    @field('is_following') isFollowing!: boolean;

    /** unread_replies : The number of replies that have not been read by the user. */
    @field('unread_replies') unreadReplies!: number;

    /** unread_mentions : The number of mentions that have not been read by the user. */
    @field('unread_mentions') unreadMentions!: number;

    /** loaded_in_global_threads : Flag to differentiate the unread threads loaded for showing unread counts/mentions */
    @field('loaded_in_global_threads') loadedInGlobalThreads!: boolean;

    /** participants : All the participants associated with this Thread */
    @children(THREAD_PARTICIPANT) participants!: Query<ThreadParticipantModel>;

    /** post : The root post of this thread */
    @immutableRelation(POST, 'id') post!: Relation<PostModel>;

    async destroyPermanently() {
        await this.participants.destroyAllPermanently();
        super.destroyPermanently();
    }
}
