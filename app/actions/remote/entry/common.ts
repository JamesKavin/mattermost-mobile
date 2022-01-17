// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMissingSidebarInfo, fetchMyChannelsForTeam, MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForTeam} from '@actions/remote/group';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {fetchMe, MyUserRequest} from '@actions/remote/user';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {queryConfig, queryWebSocketLastDisconnected} from '@queries/servers/system';
import {queryAvailableTeamIds, queryMyTeams} from '@queries/servers/team';

import type ClientError from '@client/rest/error';

export type AppEntryData = {
    initialTeamId: string;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData: MyPreferencesRequest;
    meData: MyUserRequest;
    removeTeamIds?: string[];
    removeChannelIds?: string[];
}

export type AppEntryError = {
    error?: Error | ClientError | string;
}

export const fetchAppEntryData = async (serverUrl: string, initialTeamId: string): Promise<AppEntryData | AppEntryError> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const lastDisconnected = await queryWebSocketLastDisconnected(database);
    const includeDeletedChannels = true;
    const fetchOnly = true;

    // Fetch in parallel teams / team membership / channels for current team / user preferences / user
    const promises: [Promise<MyTeamsRequest>, Promise<MyChannelsRequest | undefined>, Promise<MyPreferencesRequest>, Promise<MyUserRequest>] = [
        fetchMyTeams(serverUrl, fetchOnly),
        initialTeamId ? fetchMyChannelsForTeam(serverUrl, initialTeamId, includeDeletedChannels, lastDisconnected, fetchOnly) : Promise.resolve(undefined),
        fetchMyPreferences(serverUrl, fetchOnly),
        fetchMe(serverUrl, fetchOnly),
    ];

    const removeTeamIds: string[] = [];
    const resolution = await Promise.all(promises);
    const [teamData, , prefData, meData] = resolution;
    let [, chData] = resolution;

    if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
        // If no initial team was set in the database but got teams in the response
        const config = await queryConfig(database);
        const teamOrderPreference = getPreferenceValue(prefData.preferences || [], Preferences.TEAMS_ORDER, '', '') as string;
        const teamMembers = teamData.memberships.filter((m) => m.delete_at === 0).map((m) => m.team_id);
        const myTeams = teamData.teams!.filter((t) => teamMembers?.includes(t.id));
        const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, config.ExperimentalPrimaryTeam);
        if (defaultTeam?.id) {
            chData = await fetchMyChannelsForTeam(serverUrl, defaultTeam.id, includeDeletedChannels, lastDisconnected, fetchOnly);
        }
    }

    const removedFromTeam = teamData.memberships?.filter((m) => m.delete_at > 0);
    if (removedFromTeam?.length) {
        removeTeamIds.push(...removedFromTeam.map((m) => m.team_id));
    }

    let data: AppEntryData = {
        initialTeamId,
        teamData,
        chData,
        prefData,
        meData,
        removeTeamIds,
    };

    if (teamData.teams?.length === 0 && !teamData.error) {
        // User is no longer a member of any team
        const myTeams = await queryMyTeams(database);
        removeTeamIds.push(...(myTeams?.map((myTeam) => myTeam.id) || []));

        return {
            ...data,
            initialTeamId: '',
            removeTeamIds,
        };
    }

    const inTeam = teamData.teams?.find((t) => t.id === initialTeamId);
    const chError = chData?.error as ClientError | undefined;
    if ((!inTeam && !teamData.error) || chError?.status_code === 403) {
        // User is no longer a member of the current team
        if (!removeTeamIds.includes(initialTeamId)) {
            removeTeamIds.push(initialTeamId);
        }

        const availableTeamIds = await queryAvailableTeamIds(database, initialTeamId, teamData.teams, prefData.preferences, meData.user?.locale);
        const alternateTeamData = await fetchAlternateTeamData(serverUrl, availableTeamIds, removeTeamIds, includeDeletedChannels, lastDisconnected, fetchOnly);

        data = {
            ...data,
            ...alternateTeamData,
        };
    }

    if (data.chData?.channels) {
        const removeChannelIds: string[] = [];
        const fetchedChannelIds = data.chData.channels.map((channel) => channel.id);

        const channels = await queryAllChannelsForTeam(database, initialTeamId);
        for (const channel of channels) {
            if (!fetchedChannelIds.includes(channel.id)) {
                removeChannelIds.push(channel.id);
            }
        }

        data = {
            ...data,
            removeChannelIds,
        };
    }

    return data;
};

export const fetchAlternateTeamData = async (
    serverUrl: string, availableTeamIds: string[], removeTeamIds: string[],
    includeDeleted = true, since = 0, fetchOnly = false) => {
    let initialTeamId = '';
    let chData;

    for (const teamId of availableTeamIds) {
        // eslint-disable-next-line no-await-in-loop
        chData = await fetchMyChannelsForTeam(serverUrl, teamId, includeDeleted, since, fetchOnly);
        const chError = chData.error as ClientError | undefined;
        if (chError?.status_code === 403) {
            removeTeamIds.push(teamId);
        } else {
            initialTeamId = teamId;
            break;
        }
    }

    if (chData) {
        return {initialTeamId, chData, removeTeamIds};
    }

    return {initialTeamId, removeTeamIds};
};

export const deferredAppEntryActions = async (
    serverUrl: string, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined,
    initialTeamId?: string, initialChannelId?: string) => {
    // defer fetching posts for initial channel
    if (initialChannelId) {
        fetchPostsForChannel(serverUrl, initialChannelId);
    }

    // defer sidebar DM & GM profiles
    if (chData?.channels?.length && chData.memberships?.length) {
        const directChannels = chData.channels.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            await fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId);
        }

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
    }

    // defer groups for team
    if (initialTeamId) {
        await fetchGroupsForTeam(serverUrl, initialTeamId);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, teamData.teams, teamData.memberships, initialTeamId);
    }
};
