// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, Observable, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Config, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_UNKNOWN} from '@constants/push_proxy';
import {isMinimumServerVersion} from '@utils/helpers';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ConfigModel from '@typings/database/models/servers/config';
import type SystemModel from '@typings/database/models/servers/system';

export type PrepareCommonSystemValuesArgs = {
    lastUnreadChannelId?: string;
    currentChannelId?: string;
    currentTeamId?: string;
    currentUserId?: string;
    license?: ClientLicense;
    teamHistory?: string;
}

const {SERVER: {SYSTEM, CONFIG}} = MM_TABLES;

export const getCurrentChannelId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentChannelId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID);
        return currentChannelId?.value || '';
    } catch {
        return '';
    }
};

export const querySystemValue = (database: Database, key: string) => {
    return database.get<SystemModel>(SYSTEM).query(Q.where('id', (key)), Q.take(1));
};

export const observeCurrentChannelId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCurrentTeamId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentTeamId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID);
        return currentTeamId?.value || '';
    } catch {
        return '';
    }
};

export const observeCurrentTeamId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCurrentUserId = async (serverDatabase: Database): Promise<string> => {
    try {
        const currentUserId = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);
        return currentUserId?.value || '';
    } catch {
        return '';
    }
};

export const observeCurrentUserId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.CURRENT_USER_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeGlobalThreadsTab = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.GLOBAL_THREADS_TAB).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: 'all'}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getPushVerificationStatus = async (serverDatabase: Database): Promise<string> => {
    try {
        const status = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS);
        return status?.value || '';
    } catch {
        return '';
    }
};

export const observePushVerificationStatus = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: PUSH_PROXY_STATUS_UNKNOWN}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getCommonSystemValues = async (serverDatabase: Database) => {
    const systemRecords = (await serverDatabase.collections.get<SystemModel>(SYSTEM).query().fetch());
    let license: ClientLicense = {} as ClientLicense;
    let currentChannelId = '';
    let currentTeamId = '';
    let currentUserId = '';
    let lastUnreadChannelId = '';
    systemRecords.forEach((systemRecord) => {
        switch (systemRecord.id) {
            case SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID:
                currentChannelId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID:
                currentTeamId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.CURRENT_USER_ID:
                currentUserId = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LICENSE:
                license = systemRecord.value;
                break;
            case SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID:
                lastUnreadChannelId = systemRecord.value;
                break;
        }
    });

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        lastUnreadChannelId,
        license,
    };
};

const fromModelToClientConfig = (list: ConfigModel[]) => {
    const config: {[key: string]: any} = {};
    list.forEach((v) => {
        config[v.id] = v.value;
    });
    return config as ClientConfig;
};

export const getConfig = async (database: Database) => {
    const configList = await database.get<ConfigModel>(CONFIG).query().fetch();
    return fromModelToClientConfig(configList);
};

export const queryConfigValue = (database: Database, key: keyof ClientConfig) => {
    return database.get<ConfigModel>(CONFIG).query(Q.where('id', Q.eq(key)));
};

export const getConfigValue = async (database: Database, key: keyof ClientConfig) => {
    const list = await queryConfigValue(database, key).fetch();
    return list.length ? list[0].value : undefined;
};

export const observeConfig = (database: Database): Observable<ClientConfig | undefined> => {
    return database.get<ConfigModel>(CONFIG).query().observeWithColumns(['value']).pipe(
        switchMap((result) => of$(fromModelToClientConfig(result))),
    );
};

export const observeConfigValue = (database: Database, key: keyof ClientConfig) => {
    return queryConfigValue(database, key).observeWithColumns(['value']).pipe(
        switchMap((result) => of$(result.length ? result[0].value : undefined)),
    );
};

export const observeMaxFileCount = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 6, 0) ? 10 : 5)),
    );
};

export const observeIsCustomStatusExpirySupported = (database: Database) => {
    return observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 5, 37))),
    );
};

export const observeConfigBooleanValue = (database: Database, key: keyof ClientConfig) => {
    return observeConfigValue(database, key).pipe(
        switchMap((v) => of$(v === 'true')),
        distinctUntilChanged(),
    );
};

export const observeConfigIntValue = (database: Database, key: keyof ClientConfig, defaultValue = 0) => {
    return observeConfigValue(database, key).pipe(
        switchMap((v) => of$((parseInt(v || '0', 10) || defaultValue))),
    );
};

export const observeIsPostPriorityEnabled = (database: Database) => {
    const featureFlag = observeConfigValue(database, 'FeatureFlagPostPriority');
    const cfg = observeConfigValue(database, 'PostPriority');
    return combineLatest([featureFlag, cfg]).pipe(
        switchMap(([ff, c]) => of$(ff === Config.TRUE && c === Config.TRUE)),
        distinctUntilChanged(),
    );
};

export const observeLicense = (database: Database): Observable<ClientLicense | undefined> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LICENSE).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: undefined}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getLicense = async (serverDatabase: Database): Promise<ClientLicense | undefined> => {
    try {
        const license = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LICENSE);
        return license?.value;
    } catch {
        return undefined;
    }
};

export const getRecentCustomStatuses = async (database: Database): Promise<UserCustomStatus[]> => {
    try {
        const recent = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS);
        return recent.value;
    } catch {
        return [];
    }
};

export const getExpandedLinks = async (database: Database): Promise<Record<string, string>> => {
    try {
        const expandedLinks = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.EXPANDED_LINKS);
        return expandedLinks?.value || {};
    } catch {
        return {};
    }
};

export const observeExpandedLinks = (database: Database): Observable<Record<string, string>> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.EXPANDED_LINKS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: {}}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeRecentMentions = (database: Database): Observable<string[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_MENTIONS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getRecentReactions = async (database: Database): Promise<string[]> => {
    try {
        const reactions = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_REACTIONS);
        return reactions.value;
    } catch {
        return [];
    }
};

export const observeRecentReactions = (database: Database): Observable<string[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_REACTIONS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const observeRecentCustomStatus = (database: Database): Observable<UserCustomStatus[]> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.RECENT_CUSTOM_STATUS).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: []}))),
        switchMap((model) => of$(model.value)),
    );
};

export const getWebSocketLastDisconnected = async (serverDatabase: Database) => {
    try {
        const websocketLastDisconnected = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.WEBSOCKET);
        return (parseInt(websocketLastDisconnected?.value || 0, 10) || 0);
    } catch {
        return 0;
    }
};

export const observeWebsocketLastDisconnected = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.WEBSOCKET).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: '0'}))),
        switchMap((model) => of$(parseInt(model.value || 0, 10) || 0)),
    );
};

export const resetWebSocketLastDisconnected = async (operator: ServerDataOperator, prepareRecordsOnly = false) => {
    const lastDisconnectedAt = await getWebSocketLastDisconnected(operator.database);

    if (lastDisconnectedAt) {
        return operator.handleSystem({systems: [{
            id: SYSTEM_IDENTIFIERS.WEBSOCKET,
            value: 0,
        }],
        prepareRecordsOnly});
    }

    return [];
};

export const getTeamHistory = async (serverDatabase: Database): Promise<string[]> => {
    try {
        const teamHistory = await serverDatabase.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.TEAM_HISTORY);
        return teamHistory.value;
    } catch {
        return [];
    }
};

export const patchTeamHistory = (operator: ServerDataOperator, value: string[], prepareRecordsOnly = false) => {
    return operator.handleSystem({systems: [{
        id: SYSTEM_IDENTIFIERS.TEAM_HISTORY,
        value: JSON.stringify(value),
    }],
    prepareRecordsOnly});
};

export async function prepareCommonSystemValues(
    operator: ServerDataOperator, values: PrepareCommonSystemValuesArgs): Promise<SystemModel[]> {
    try {
        const {lastUnreadChannelId, currentChannelId, currentTeamId, currentUserId, license} = values;
        const systems: IdValue[] = [];

        if (license !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.LICENSE,
                value: JSON.stringify(license),
            });
        }

        if (lastUnreadChannelId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID,
                value: lastUnreadChannelId,
            });
        }

        if (currentUserId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: currentUserId,
            });
        }

        if (currentTeamId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID,
                value: currentTeamId,
            });
        }

        if (currentChannelId !== undefined) {
            systems.push({
                id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID,
                value: currentChannelId,
            });
        }

        return operator.handleSystem({
            systems,
            prepareRecordsOnly: true,
        });
    } catch {
        return [];
    }
}

export async function setCurrentChannelId(operator: ServerDataOperator, channelId: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {currentChannelId: channelId});
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export async function setCurrentTeamAndChannelId(operator: ServerDataOperator, teamId?: string, channelId?: string) {
    try {
        const models = await prepareCommonSystemValues(operator, {
            currentChannelId: channelId,
            currentTeamId: teamId,
        });
        if (models) {
            await operator.batchRecords(models);
        }

        return {currentTeamId: teamId, currentChannelId: channelId};
    } catch (error) {
        return {error};
    }
}

export const observeLastUnreadChannelId = (database: Database): Observable<string> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: ''}))),
        switchMap((model) => {
            if (model.value) {
                return of$(model.value);
            }

            return observeCurrentChannelId(database);
        }),
    );
};

export const queryLastUnreadChannelId = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID);
};

export const getLastUnreadChannelId = async (serverDatabase: Database): Promise<string> => {
    try {
        const lastUnreadChannelId = (await queryLastUnreadChannelId(serverDatabase).fetch())[0];
        return lastUnreadChannelId?.value || '';
    } catch {
        return '';
    }
};

export const observeOnlyUnreads = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.ONLY_UNREADS).observeWithColumns(['value']).pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: false}))),
        switchMap((model) => of$(model.value as boolean)),
    );
};

export const observeAllowedThemesKeys = (database: Database) => {
    const defaultThemeKeys = Object.keys(Preferences.THEMES);
    return observeConfigValue(database, 'AllowedThemes').pipe(
        switchMap((allowedThemes) => {
            let acceptableThemes = defaultThemeKeys;
            if (allowedThemes) {
                const allowedThemeKeys = (allowedThemes ?? '').split(',').filter(String);
                if (allowedThemeKeys.length) {
                    acceptableThemes = defaultThemeKeys.filter((k) => allowedThemeKeys.includes(k));
                }
            }

            return of$(acceptableThemes);
        }),
    );
};

export const getExpiredSession = async (database: Database) => {
    try {
        const session = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.SESSION_EXPIRATION);
        return (session?.value || {}) as SessionExpiration;
    } catch {
        return undefined;
    }
};

export const observeLastDismissedAnnouncement = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_DISMISSED_BANNER).observeWithColumns(['value']).pipe(
        switchMap((list) => of$(list[0]?.value)),
    );
};

export const observeCanUploadFiles = (database: Database) => {
    const enableFileAttachments = observeConfigBooleanValue(database, 'EnableFileAttachments');
    const enableMobileFileUpload = observeConfigBooleanValue(database, 'EnableMobileFileUpload');
    const license = observeLicense(database);

    return combineLatest([enableFileAttachments, enableMobileFileUpload, license]).pipe(
        switchMap(([efa, emfu, l]) => of$(
            efa ||
                (l?.IsLicensed !== 'true' && l?.Compliance !== 'true' && emfu),
        ),
        ),
    );
};

export const observeLastServerVersionCheck = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.LAST_SERVER_VERSION_CHECK).observeWithColumns(['value']).pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$({value: 0}))),
        switchMap((model) => of$(parseInt(model.value, 10))),
    );
};
