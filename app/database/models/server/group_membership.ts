// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

const {GROUP, GROUP_MEMBERSHIP, USER} = MM_TABLES.SERVER;

/**
 * The GroupMembership model represents the 'association table' where many groups have users and many users are in
 * groups (relationship type N:N)
 */
export default class GroupMembershipModel extends Model {
    /** table (name) : GroupMembership */
    static table = GROUP_MEMBERSHIP;

    /** associations : Describes every relationship to this table */
    static associations: Associations = {

        /** A GROUP can have multiple users in it */
        [GROUP]: {type: 'belongs_to', key: 'group_id'},

        /** A USER can be part of multiple groups */
        [USER]: {type: 'belongs_to', key: 'user_id'},
    };

    /* group_id: The foreign key to the related Group record*/
    @field('group_id') groupId!: string;

    /* user_id: The foreign key to the related User record*/
    @field('user_id') userId!: string;

    /** group : The related group this user belongs to */
    @immutableRelation(GROUP, 'group_id') group!: Relation<GroupModel>;

    /** user : The related user in the group */
    @immutableRelation(USER, 'user_id') user!: Relation<UserModel>;
}
