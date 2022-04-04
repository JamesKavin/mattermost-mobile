// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam as localRemoveUserFromTeam} from '@actions/local/team';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {prepareCategories, prepareCategoryChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam, getDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareCommonSystemValues, getCurrentTeamId, getWebSocketLastDisconnected} from '@queries/servers/system';
import {addTeamToTeamHistory, prepareDeleteTeam, prepareMyTeams, getNthLastChannelFromTeam, queryTeamsById, syncTeamTable} from '@queries/servers/team';
import {isTablet} from '@utils/helpers';

import {fetchMyChannelsForTeam, switchToChannelById} from './channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from './post';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';

import type ClientError from '@client/rest/error';

export type MyTeamsRequest = {
    teams?: Team[];
    memberships?: TeamMembership[];
    error?: unknown;
}

export const addUserToTeam = async (serverUrl: string, teamId: string, userId: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const member = await client.addToTeam(teamId, userId);

        if (!fetchOnly) {
            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
            const {channels, memberships: channelMembers, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const myTeams: MyTeam[] = [{
                    id: member.team_id,
                    roles: member.roles,
                }];

                const models: Model[] = (await Promise.all([
                    operator.handleMyTeam({myTeams, prepareRecordsOnly: true}),
                    operator.handleTeamMemberships({teamMemberships: [member], prepareRecordsOnly: true}),
                    ...await prepareMyChannelsForTeam(operator, teamId, channels || [], channelMembers || []),
                    prepareCategories(operator, categories || []),
                    prepareCategoryChannels(operator, categories || []),
                ])).flat();

                if (models.length) {
                    await operator.batchRecords(models);
                }

                if (await isTablet()) {
                    const channel = await getDefaultChannelForTeam(operator.database, teamId);
                    if (channel) {
                        fetchPostsForChannel(serverUrl, channel.id);
                    }
                }
            }
        }

        return {member};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchMyTeams = async (serverUrl: string, fetchOnly = false): Promise<MyTeamsRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [teams, memberships]: [Team[], TeamMembership[]] = await Promise.all([
            client.getMyTeams(),
            client.getMyTeamMembers(),
        ]);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            const modelPromises: Array<Promise<Model[]>> = [];
            if (operator) {
                const removeTeamIds = new Set(memberships.filter((m) => m.delete_at > 0).map((m) => m.team_id));
                const remainingTeams = teams.filter((t) => !removeTeamIds.has(t.id));
                const prepare = prepareMyTeams(operator, remainingTeams, memberships);
                if (prepare) {
                    modelPromises.push(...prepare);
                }

                if (removeTeamIds.size) {
                    // Immediately delete myTeams so that the UI renders only teams the user is a member of.
                    const removeTeams = await queryTeamsById(operator.database, Array.from(removeTeamIds)).fetch();
                    removeTeams.forEach((team) => {
                        modelPromises.push(prepareDeleteTeam(team));
                    });
                }

                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    const flattenedModels = models.flat();
                    if (flattenedModels.length > 0) {
                        await operator.batchRecords(flattenedModels);
                    }
                }
            }
        }

        return {teams, memberships};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchMyTeam = async (serverUrl: string, teamId: string, fetchOnly = false): Promise<MyTeamsRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [team, membership] = await Promise.all([
            client.getTeam(teamId),
            client.getTeamMember(teamId, 'me'),
        ]);
        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const modelPromises = prepareMyTeams(operator, [team], [membership]);
                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    const flattenedModels = models.flat();
                    if (flattenedModels?.length > 0) {
                        await operator.batchRecords(flattenedModels);
                    }
                }
            }
        }

        return {teams: [team], memberships: [membership]};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchAllTeams = async (serverUrl: string, fetchOnly = false): Promise<MyTeamsRequest> => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const teams = await client.getTeams();

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                syncTeamTable(operator, teams);
            }
        }

        return {teams};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const fetchTeamsChannelsAndUnreadPosts = async (serverUrl: string, since: number, teams: Team[], memberships: TeamMembership[], excludeTeamId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const membershipSet = new Set(memberships.map((m) => m.team_id));
    const myTeams = teams.filter((t) => membershipSet.has(t.id) && t.id !== excludeTeamId);

    for await (const team of myTeams) {
        const {channels, memberships: members} = await fetchMyChannelsForTeam(serverUrl, team.id, since > 0, since, false, true);

        if (channels?.length && members?.length) {
            fetchPostsForUnreadChannels(serverUrl, channels, members);
        }
    }

    return {error: undefined};
};

export const fetchTeamByName = async (serverUrl: string, teamName: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const team = await client.getTeamByName(teamName);

        if (!fetchOnly) {
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const model = await operator.handleTeam({teams: [team], prepareRecordsOnly: true});
                if (model) {
                    await operator.batchRecords(model);
                }
            }
        }

        return {team};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const removeUserFromTeam = async (serverUrl: string, teamId: string, userId: string, fetchOnly = false) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        await client.removeFromTeam(teamId, userId);

        if (!fetchOnly) {
            localRemoveUserFromTeam(serverUrl, teamId);
            fetchAllTeams(serverUrl);
        }

        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export const handleTeamChange = async (serverUrl: string, teamId: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;
    const currentTeamId = await getCurrentTeamId(database);

    if (currentTeamId === teamId) {
        return;
    }

    let channelId = '';
    if (await isTablet()) {
        channelId = await getNthLastChannelFromTeam(database, teamId);
        if (channelId) {
            await switchToChannelById(serverUrl, channelId, teamId);
            return;
        }
    }

    const models = [];
    const system = await prepareCommonSystemValues(operator, {currentChannelId: channelId, currentTeamId: teamId});
    if (system?.length) {
        models.push(...system);
    }
    const history = await addTeamToTeamHistory(operator, teamId, true);
    if (history.length) {
        models.push(...history);
    }

    if (models.length) {
        await operator.batchRecords(models);
    }

    // If WebSocket is not disconnected we fetch everything since this moment
    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || Date.now();
    const {channels, memberships, error} = await fetchMyChannelsForTeam(serverUrl, teamId, true, lastDisconnectedAt, false, true);

    if (error) {
        DeviceEventEmitter.emit(Events.TEAM_LOAD_ERROR, serverUrl, error);
    }

    if (channels?.length && memberships?.length) {
        fetchPostsForUnreadChannels(serverUrl, channels, memberships, channelId);
    }
};
