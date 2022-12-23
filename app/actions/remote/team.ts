// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam as localRemoveUserFromTeam} from '@actions/local/team';
import {Client} from '@client/rest';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam, getDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareCommonSystemValues, getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {addTeamToTeamHistory, prepareDeleteTeam, prepareMyTeams, getNthLastChannelFromTeam, queryTeamsById, getLastTeam, getTeamById, removeTeamFromTeamHistory, queryMyTeams} from '@queries/servers/team';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {setTeamLoading} from '@store/team_load_store';
import {isTablet} from '@utils/helpers';
import {logDebug} from '@utils/log';

import {fetchMyChannelsForTeam, switchToChannelById} from './channel';
import {fetchGroupsForTeamIfConstrained} from './groups';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from './post';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';

import type ClientError from '@client/rest/error';

export type MyTeamsRequest = {
    teams?: Team[];
    memberships?: TeamMembership[];
    error?: unknown;
}

export async function addCurrentUserToTeam(serverUrl: string, teamId: string, fetchOnly = false) {
    let database;
    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (error) {
        return {error};
    }

    const currentUserId = await getCurrentUserId(database);

    if (!currentUserId) {
        return {error: 'no current user'};
    }
    return addUserToTeam(serverUrl, teamId, currentUserId, fetchOnly);
}

export async function addUserToTeam(serverUrl: string, teamId: string, userId: string, fetchOnly = false) {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let loadEventSent = false;
    try {
        EphemeralStore.startAddingToTeam(teamId);
        const team = await client.getTeam(teamId);
        const member = await client.addToTeam(teamId, userId);

        if (!fetchOnly) {
            setTeamLoading(serverUrl, true);
            loadEventSent = true;

            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
            const {channels, memberships: channelMembers, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
            const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
            if (operator) {
                const myTeams: MyTeam[] = [{
                    id: member.team_id,
                    roles: member.roles,
                }];

                const models: Model[] = (await Promise.all([
                    operator.handleTeam({teams: [team], prepareRecordsOnly: true}),
                    operator.handleMyTeam({myTeams, prepareRecordsOnly: true}),
                    operator.handleTeamMemberships({teamMemberships: [member], prepareRecordsOnly: true}),
                    ...await prepareMyChannelsForTeam(operator, teamId, channels || [], channelMembers || []),
                    prepareCategoriesAndCategoriesChannels(operator, categories || [], true),
                ])).flat();

                await operator.batchRecords(models);
                setTeamLoading(serverUrl, false);
                loadEventSent = false;

                if (await isTablet()) {
                    const channel = await getDefaultChannelForTeam(operator.database, teamId);
                    if (channel) {
                        fetchPostsForChannel(serverUrl, channel.id);
                    }
                }
            } else {
                setTeamLoading(serverUrl, false);
                loadEventSent = false;
            }
        }
        EphemeralStore.finishAddingToTeam(teamId);
        updateCanJoinTeams(serverUrl);
        return {member};
    } catch (error) {
        if (loadEventSent) {
            setTeamLoading(serverUrl, false);
        }
        EphemeralStore.finishAddingToTeam(teamId);
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}

export async function fetchMyTeams(serverUrl: string, fetchOnly = false): Promise<MyTeamsRequest> {
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
}

export async function fetchMyTeam(serverUrl: string, teamId: string, fetchOnly = false): Promise<MyTeamsRequest> {
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
}

export const fetchAllTeams = async (serverUrl: string, page = 0, perPage = PER_PAGE_DEFAULT): Promise<{teams?: Team[]; error?: any}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const teams = await client.getTeams(page, perPage);
        return {teams};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

const recCanJoinTeams = async (client: Client, myTeamsIds: Set<string>, page: number): Promise<boolean> => {
    const fetchedTeams = await client.getTeams(page, PER_PAGE_DEFAULT);
    if (fetchedTeams.find((t) => !myTeamsIds.has(t.id) && t.delete_at === 0)) {
        return true;
    }

    if (fetchedTeams.length === PER_PAGE_DEFAULT) {
        return recCanJoinTeams(client, myTeamsIds, page + 1);
    }

    return false;
};

const LOAD_MORE_THRESHOLD = 10;
export async function fetchTeamsForComponent(
    serverUrl: string,
    page: number,
    joinedIds?: Set<string>,
    alreadyLoaded: Team[] = [],
): Promise<{teams: Team[]; hasMore: boolean; page: number}> {
    let hasMore = true;
    const {teams, error} = await fetchAllTeams(serverUrl, page, PER_PAGE_DEFAULT);
    if (error || !teams || teams.length < PER_PAGE_DEFAULT) {
        hasMore = false;
    }

    if (error) {
        return {teams: alreadyLoaded, hasMore, page};
    }

    if (teams?.length) {
        const notJoinedTeams = joinedIds ? teams.filter((t) => !joinedIds.has(t.id)) : teams;
        alreadyLoaded.push(...notJoinedTeams);

        if (teams.length < PER_PAGE_DEFAULT) {
            hasMore = false;
        }

        if (
            hasMore &&
            (alreadyLoaded.length > LOAD_MORE_THRESHOLD)
        ) {
            return fetchTeamsForComponent(serverUrl, page + 1, joinedIds, alreadyLoaded);
        }

        return {teams: alreadyLoaded, hasMore, page: page + 1};
    }

    return {teams: alreadyLoaded, hasMore: false, page};
}

export const updateCanJoinTeams = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const myTeams = await queryMyTeams(database).fetch();
        const myTeamsIds = new Set(myTeams.map((m) => m.id));

        const canJoin = await recCanJoinTeams(client, myTeamsIds, 0);

        EphemeralStore.setCanJoinOtherTeams(serverUrl, canJoin);
        return {};
    } catch (error) {
        EphemeralStore.setCanJoinOtherTeams(serverUrl, false);
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
        const {channels, memberships: members} = await fetchMyChannelsForTeam(serverUrl, team.id, true, since, false, true);

        if (channels?.length && members?.length) {
            fetchPostsForUnreadChannels(serverUrl, channels, members);
        }
    }

    return {error: undefined};
};

export async function fetchTeamByName(serverUrl: string, teamName: string, fetchOnly = false) {
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
                const models = await operator.handleTeam({teams: [team], prepareRecordsOnly: true});
                await operator.batchRecords(models);
            }
        }

        return {team};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}

export const removeCurrentUserFromTeam = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        return removeUserFromTeam(serverUrl, teamId, userId, fetchOnly);
    } catch (error) {
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
            updateCanJoinTeams(serverUrl);
        }

        return {error: undefined};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
};

export async function handleTeamChange(serverUrl: string, teamId: string) {
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
    DeviceEventEmitter.emit(Events.TEAM_SWITCH, true);
    if (await isTablet()) {
        channelId = await getNthLastChannelFromTeam(database, teamId);
        if (channelId) {
            await switchToChannelById(serverUrl, channelId, teamId);
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);
            return;
        }
    }

    const models = [];
    const system = await prepareCommonSystemValues(operator, {currentChannelId: channelId, currentTeamId: teamId, lastUnreadChannelId: ''});
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
    DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);

    // Fetch Groups + GroupTeams
    fetchGroupsForTeamIfConstrained(serverUrl, teamId);
}

export async function handleKickFromTeam(serverUrl: string, teamId: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentTeamId = await getCurrentTeamId(database);
        if (currentTeamId !== teamId) {
            return;
        }

        const currentServer = await getActiveServerUrl();
        if (currentServer === serverUrl) {
            const team = await getTeamById(database, teamId);
            DeviceEventEmitter.emit(Events.LEAVE_TEAM, team?.displayName);
            await dismissAllModals();
            await popToRoot();
        }

        await removeTeamFromTeamHistory(operator, teamId);
        const teamToJumpTo = await getLastTeam(database, teamId);
        if (teamToJumpTo) {
            await handleTeamChange(serverUrl, teamToJumpTo);
        }

        // Resetting to team select handled by the home screen
    } catch (error) {
        logDebug('Failed to kick user from team', error);
    }
}
