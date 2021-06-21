// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const MM_TABLES = {
    APP: {
        INFO: 'Info',
        GLOBAL: 'Global',
        SERVERS: 'Servers',
    },
    SERVER: {
        CHANNEL: 'Channel',
        CHANNEL_INFO: 'ChannelInfo',
        CHANNEL_MEMBERSHIP: 'ChannelMembership',
        CUSTOM_EMOJI: 'CustomEmoji',
        DRAFT: 'Draft',
        FILE: 'File',
        GROUP: 'Group',
        GROUPS_IN_CHANNEL: 'GroupsInChannel',
        GROUPS_IN_TEAM: 'GroupsInTeam',
        GROUP_MEMBERSHIP: 'GroupMembership',
        MY_CHANNEL: 'MyChannel',
        MY_CHANNEL_SETTINGS: 'MyChannelSettings',
        MY_TEAM: 'MyTeam',
        POST: 'Post',
        POSTS_IN_CHANNEL: 'PostsInChannel',
        POSTS_IN_THREAD: 'PostsInThread',
        POST_METADATA: 'PostMetadata',
        PREFERENCE: 'Preference',
        REACTION: 'Reaction',
        ROLE: 'Role',
        SLASH_COMMAND: 'SlashCommand',
        SYSTEM: 'System',
        TEAM: 'Team',
        TEAM_CHANNEL_HISTORY: 'TeamChannelHistory',
        TEAM_MEMBERSHIP: 'TeamMembership',
        TEAM_SEARCH_HISTORY: 'TeamSearchHistory',
        TERMS_OF_SERVICE: 'TermsOfService',
        USER: 'User',
    },
};

export const MIGRATION_EVENTS = keyMirror({
    MIGRATION_ERROR: null,
    MIGRATION_STARTED: null,
    MIGRATION_SUCCESS: null,
});

export default {
    MM_TABLES,
    MIGRATION_EVENTS,
};
