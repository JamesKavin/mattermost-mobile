// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import type TeamModel from './team';
import type ThreadModel from './thread';

/**
 * ThreadInTeam model helps us to determine for which team we have loaded which threads
 * this was done mostly because of threads belonging in DM/GM channels,
 * so they belong in multiple teams.
 */
export default class ThreadInTeamModel extends Model {
    /** table (name) : ThreadsInTeam */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** thread_id: Associated thread identifier */
    threadId: string;

    /** teamId: Associated thread identifier */
    teamId: string;

    /** loaded_in_global_threads : Flag to differentiate the unread threads loaded for showing unread counts/mentions */
    loadedInGlobalThreads: boolean;

    /** thread : The related record to the parent Thread model */
    thread: Relation<ThreadModel>;

    /** team : The related record to the parent Team model */
    team: Relation<TeamModel>;
}
