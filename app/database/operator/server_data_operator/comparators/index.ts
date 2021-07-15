// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type DraftModel from '@typings/database/models/servers/draft';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type GroupsInChannelModel from '@typings/database/models/servers/groups_in_channel';
import type GroupsInTeamModel from '@typings/database/models/servers/groups_in_team';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PostModel from '@typings/database/models/servers/post';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type RoleModel from '@typings/database/models/servers/role';
import type SlashCommandModel from '@typings/database/models/servers/slash_command';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';
import type TeamChannelHistoryModel from '@typings/database/models/servers/team_channel_history';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';
import type TermsOfServiceModel from '@typings/database/models/servers/terms_of_service';
import type UserModel from '@typings/database/models/servers/user';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparator will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const isRecordRoleEqualToRaw = (record: RoleModel, raw: Role) => {
    return raw.id === record.id;
};

export const isRecordSystemEqualToRaw = (record: SystemModel, raw: IdValue) => {
    return raw.id === record.id;
};

export const isRecordTermsOfServiceEqualToRaw = (record: TermsOfServiceModel, raw: TermsOfService) => {
    return raw.id === record.id;
};

export const isRecordDraftEqualToRaw = (record: DraftModel, raw: Draft) => {
    return raw.channel_id === record.channelId;
};

export const isRecordPostEqualToRaw = (record: PostModel, raw: Post) => {
    return raw.id === record.id;
};

export const isRecordUserEqualToRaw = (record: UserModel, raw: UserProfile) => {
    return raw.id === record.id;
};

export const isRecordPreferenceEqualToRaw = (record: PreferenceModel, raw: PreferenceType) => {
    return (
        raw.category === record.category &&
        raw.name === record.name &&
        raw.user_id === record.userId
    );
};

export const isRecordTeamMembershipEqualToRaw = (record: TeamMembershipModel, raw: TeamMembership) => {
    return raw.team_id === record.teamId && raw.user_id === record.userId;
};

export const isRecordCustomEmojiEqualToRaw = (record: CustomEmojiModel, raw: CustomEmoji) => {
    return raw.id === record.id;
};

export const isRecordGroupMembershipEqualToRaw = (record: GroupMembershipModel, raw: GroupMembership) => {
    return raw.user_id === record.userId && raw.group_id === record.groupId;
};

export const isRecordChannelMembershipEqualToRaw = (record: ChannelMembershipModel, raw: ChannelMembership) => {
    return raw.user_id === record.userId && raw.channel_id === record.channelId;
};

export const isRecordGroupEqualToRaw = (record: GroupModel, raw: Group) => {
    return raw.id === record.id;
};

export const isRecordGroupsInTeamEqualToRaw = (record: GroupsInTeamModel, raw: GroupTeam) => {
    return raw.team_id === record.teamId && raw.group_id === record.groupId;
};

export const isRecordGroupsInChannelEqualToRaw = (record: GroupsInChannelModel, raw: GroupChannel) => {
    return raw.channel_id === record.channelId && raw.group_id === record.groupId;
};

export const isRecordTeamEqualToRaw = (record: TeamModel, raw: Team) => {
    return raw.id === record.id;
};

export const isRecordTeamChannelHistoryEqualToRaw = (record: TeamChannelHistoryModel, raw: TeamChannelHistory) => {
    return raw.team_id === record.teamId;
};

export const isRecordTeamSearchHistoryEqualToRaw = (record: TeamSearchHistoryModel, raw: TeamSearchHistory) => {
    return raw.team_id === record.teamId && raw.term === record.term;
};

export const isRecordSlashCommandEqualToRaw = (record: SlashCommandModel, raw: SlashCommand) => {
    return raw.id === record.id;
};

export const isRecordMyTeamEqualToRaw = (record: MyTeamModel, raw: MyTeam) => {
    return raw.team_id === record.teamId;
};

export const isRecordChannelEqualToRaw = (record: ChannelModel, raw: Channel) => {
    return raw.id === record.id;
};

export const isRecordMyChannelSettingsEqualToRaw = (record: MyChannelSettingsModel, raw: ChannelMembership) => {
    return raw.channel_id === record.channelId;
};

export const isRecordChannelInfoEqualToRaw = (record: ChannelInfoModel, raw: ChannelInfo) => {
    return raw.channel_id === record.channelId;
};

export const isRecordMyChannelEqualToRaw = (record: MyChannelModel, raw: ChannelMembership) => {
    return raw.channel_id === record.channelId;
};
