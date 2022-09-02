// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {prepareCommonSystemValues, getCommonSystemValues, getCurrentTeamId, getWebSocketLastDisconnected, setCurrentTeamAndChannelId, getConfig, getCurrentChannelId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {deleteV1Data} from '@utils/file';
import {isTablet} from '@utils/helpers';
import {logDebug, logInfo} from '@utils/log';

import {deferredAppEntryActions, entry, registerDeviceToken, syncOtherServers, verifyPushProxy} from './common';
import {graphQLCommon} from './gql_common';

export async function appEntry(serverUrl: string, since = 0, isUpgrade = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    if (!since) {
        registerDeviceToken(serverUrl);
    }

    // clear lastUnreadChannelId
    const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
    if (removeLastUnreadChannelId) {
        operator.batchRecords(removeLastUnreadChannelId);
    }

    const config = await getConfig(database);
    let result;
    if (config?.FeatureFlagGraphQL === 'true') {
        const {currentTeamId, currentChannelId} = await getCommonSystemValues(database);
        result = await graphQLCommon(serverUrl, true, currentTeamId, currentChannelId, '', isUpgrade);
        if (result.error) {
            logDebug('Error using GraphQL, trying REST', result.error);
            result = restAppEntry(serverUrl, since, isUpgrade);
        }
    } else {
        result = restAppEntry(serverUrl, since, isUpgrade);
    }

    if (!since) {
        // Load data from other servers
        syncOtherServers(serverUrl);
    }

    verifyPushProxy(serverUrl);

    return result;
}

async function restAppEntry(serverUrl: string, since = 0, isUpgrade = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const tabletDevice = await isTablet();
    const currentTeamId = await getCurrentTeamId(database);
    const currentChannelId = await getCurrentChannelId(database);
    const lastDisconnectedAt = (await getWebSocketLastDisconnected(database)) || since;

    const entryData = await entry(serverUrl, currentTeamId, currentChannelId, since);
    if ('error' in entryData) {
        return {error: entryData.error};
    }

    const {models, initialTeamId, initialChannelId, prefData, teamData, chData, meData} = entryData;
    if (isUpgrade && meData?.user) {
        const me = await prepareCommonSystemValues(operator, {currentUserId: meData.user.id});
        if (me?.length) {
            await operator.batchRecords(me);
        }
    }

    let switchToChannel = false;

    // Immediately set the new team as the current team in the database so that the UI
    // renders the correct team.
    if (tabletDevice && initialChannelId) {
        switchToChannel = true;
        switchToChannelById(serverUrl, initialChannelId, initialTeamId);
    } else {
        setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
    }

    const dt = Date.now();
    await operator.batchRecords(models);
    logInfo('ENTRY MODELS BATCHING TOOK', `${Date.now() - dt}ms`);

    const {id: currentUserId, locale: currentUserLocale} = meData?.user || (await getCurrentUser(database))!;
    const {config, license} = await getCommonSystemValues(database);
    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId, switchToChannel ? initialChannelId : undefined);

    return {userId: currentUserId};
}

export async function upgradeEntry(serverUrl: string) {
    const dt = Date.now();

    try {
        const configAndLicense = await fetchConfigAndLicense(serverUrl, false);
        const entryData = await appEntry(serverUrl, 0, true);
        const error = configAndLicense.error || entryData.error;

        if (!error) {
            DatabaseManager.updateServerIdentifier(serverUrl, configAndLicense.config!.DiagnosticId);
            DatabaseManager.setActiveServerDatabase(serverUrl);
            deleteV1Data();
        }

        return {error, time: Date.now() - dt};
    } catch (e) {
        return {error: e, time: Date.now() - dt};
    }
}
