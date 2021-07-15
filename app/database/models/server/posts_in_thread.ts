// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type PostModel from '@typings/database/models/servers/post';

const {POST, POSTS_IN_THREAD} = MM_TABLES.SERVER;

/**
 * PostsInThread model helps us to combine adjacent threads together without leaving
 * gaps in between for an efficient user reading experience for threads.
 */
export default class PostsInThreadModel extends Model {
    /** table (name) : PostsInThread */
    static table = POSTS_IN_THREAD;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A POST can have multiple POSTS_IN_THREAD.(relationship is 1:N)*/
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** earliest : Lower bound of a timestamp range */
    @field('earliest') earliest!: number;

    /** latest : Upper bound of a timestamp range */
    @field('latest') latest!: number;

    /** post_id : The foreign key of the related Post model */
    @field('post_id') postId!: string;

    /** post : The related record to the parent Post model */
    @immutableRelation(POST, 'post_id') post!: Relation<PostModel>;
}
