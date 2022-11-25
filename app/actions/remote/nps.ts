// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import NetworkManager from '@managers/network_manager';

export const isNPSEnabled = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const manifests = await client.getPluginsManifests();
        for (const v of manifests) {
            if (v.id === General.NPS_PLUGIN_ID) {
                return true;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
};

export const giveFeedbackAction = async (serverUrl: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const post = await client.npsGiveFeedbackAction();
        return {post};
    } catch (error) {
        return {error};
    }
};
