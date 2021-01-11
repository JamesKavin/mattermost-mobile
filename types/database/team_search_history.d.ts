// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Team from '@typings/database/team';

/**
 * The TeamSearchHistory model holds the term searched within a team.  The searches are performed
 * at team level in the app.
 */
export default class TeamSearchHistory extends Model {
    /** table (entity name) : TeamSearchHistory */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** createdAt : The timestamp at which this search was performed */
    createdAt: number;

    /** teamId : The foreign key to the parent Team model */
    teamId: string;

    /** displayTerm : The term that we display to the user */
    displayTerm: string;

    /** term : The term that is sent to the server to perform the search */
    term: string;

    /** team : The related record to the parent team model */
    team: Relation<Team>;
}
