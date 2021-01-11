// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import Model, {Associations} from '@nozbe/watermelondb/Model';

import Team from '@typings/database/team';

/**
 * The SlashCommand model describes the commands of the various commands available in each team.
 */
export default class SlashCommand extends Model {
    /** table (entity name) : SlashCommand */
    static table: string;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations;

    /** is_auto_complete : Boolean flag for auto-completing slash commands */
    isAutoComplete: boolean;

    /** description : The description for the slash command */
    description: string;

    /** display_name : The name for the command */
    displayName: string;

    /** hint : A helpful text explaining the purpose of the command  */
    hint: string;

    /** method : API methods like HTTP */
    method: string;

    /** team_id : The foreign key of the parent Team */
    teamId: string;

    /** token : A key identifying this slash command */
    token: string;

    /** trigger : A pattern/text used to recognize when a slash command needs to launch */
    trigger: string;

    /** team : The related parent TEAM record */
    team: Relation<Team>;
}
