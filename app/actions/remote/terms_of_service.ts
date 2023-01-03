// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUser} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

import type ClientError from '@client/rest/error';

export async function fetchTermsOfService(serverUrl: string): Promise<{terms?: TermsOfService; error?: any}> {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const terms = await client.getTermsOfService();
        return {terms};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}

export async function updateTermsOfServiceStatus(serverUrl: string, id: string, status: boolean): Promise<{resp?: {status: string}; error?: any}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const resp = await client.updateMyTermsOfServiceStatus(id, status);

        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (currentUser) {
            currentUser.prepareUpdate((u) => {
                if (status) {
                    u.termsOfServiceCreateAt = Date.now();
                    u.termsOfServiceId = id;
                } else {
                    u.termsOfServiceCreateAt = 0;
                    u.termsOfServiceId = '';
                }
            });
            operator.batchRecords([currentUser]);
        }
        return {resp};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}
