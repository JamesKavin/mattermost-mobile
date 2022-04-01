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
        CATEGORY: 'Category',
        CATEGORY_CHANNEL: 'CategoryChannel',
        CHANNEL: 'Channel',
        CHANNEL_INFO: 'ChannelInfo',
        CHANNEL_MEMBERSHIP: 'ChannelMembership',
        CUSTOM_EMOJI: 'CustomEmoji',
        DRAFT: 'Draft',
        FILE: 'File',
        MY_CHANNEL: 'MyChannel',
        MY_CHANNEL_SETTINGS: 'MyChannelSettings',
        MY_TEAM: 'MyTeam',
        POST: 'Post',
        POSTS_IN_CHANNEL: 'PostsInChannel',
        POSTS_IN_THREAD: 'PostsInThread',
        PREFERENCE: 'Preference',
        REACTION: 'Reaction',
        ROLE: 'Role',
        SYSTEM: 'System',
        TEAM: 'Team',
        TEAM_CHANNEL_HISTORY: 'TeamChannelHistory',
        TEAM_MEMBERSHIP: 'TeamMembership',
        TEAM_SEARCH_HISTORY: 'TeamSearchHistory',
        TERMS_OF_SERVICE: 'TermsOfService',
        THREAD: 'Thread',
        THREADS_IN_TEAM: 'ThreadsInTeam',
        THREAD_PARTICIPANT: 'ThreadParticipant',
        USER: 'User',
    },
};

export const MIGRATION_EVENTS = keyMirror({
    MIGRATION_ERROR: null,
    MIGRATION_STARTED: null,
    MIGRATION_SUCCESS: null,
});

export const SYSTEM_IDENTIFIERS = {
    CONFIG: 'config',
    CURRENT_CHANNEL_ID: 'currentChannelId',
    CURRENT_TEAM_ID: 'currentTeamId',
    CURRENT_USER_ID: 'currentUserId',
    DATA_RETENTION_POLICIES: 'dataRetentionPolicies',
    EXPANDED_LINKS: 'expandedLinks',
    INTEGRATION_TRIGGER_ID: 'IntegreationTriggerId',
    LICENSE: 'license',
    RECENT_CUSTOM_STATUS: 'recentCustomStatus',
    RECENT_MENTIONS: 'recentMentions',
    RECENT_REACTIONS: 'recentReactions',
    TEAM_HISTORY: 'teamHistory',
    WEBSOCKET: 'WebSocket',
};

export const GLOBAL_IDENTIFIERS = {
    DEVICE_TOKEN: 'deviceToken',
    MULTI_SERVER_TUTORIAL: 'multiServerTutorial',
};

export default {
    GLOBAL_IDENTIFIERS,
    MM_TABLES,
    MIGRATION_EVENTS,
    SYSTEM_IDENTIFIERS,
};
