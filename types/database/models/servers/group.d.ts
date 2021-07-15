// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

/**
 * The Group model unifies/assembles users, teams and channels based on a common ground.  For example, a group can be
 * all users who are in the mobile team.  If one needs to send that group a message, then s/he can mention the group's
 * name in the message. (e.g @mobile_team)
 */
export default class GroupModel extends Model {
    /** table (name) : Group */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** display_name : The display name for the group */
    displayName: string;

    /** name : The name of the group */
    name: string;

    /** groupsInChannel : All the related children records from GroupsInChannel */
    groupsInChannel: GroupsInChannelModel[];

    /** groupsInTeam : All the related children records from GroupsInTeam */
    groupsInTeam: GroupsInTeamModel[];

    /** groupMemberships : All the related children records from GroupMembership */
    groupMemberships: GroupMembershipModel[];
}
