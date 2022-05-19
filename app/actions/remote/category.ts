// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {General} from '@constants';
import {CHANNELS_CATEGORY, DMS_CATEGORY, FAVORITES_CATEGORY} from '@constants/categories';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelCategory, queryCategoriesByTeamIds} from '@queries/servers/categories';
import {getChannelById} from '@queries/servers/channel';
import {getCurrentTeamId} from '@queries/servers/system';
import {showFavoriteChannelSnackbar} from '@utils/snack_bar';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

export type CategoriesRequest = {
     categories?: CategoryWithChannels[];
     error?: unknown;
 }

export const fetchCategories = async (serverUrl: string, teamId: string, prune = false, fetchOnly = false): Promise<CategoriesRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const {categories} = await client.getCategories('me', teamId);

        if (!fetchOnly) {
            storeCategories(serverUrl, categories, prune);
        }

        return {categories};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const toggleFavoriteChannel = async (serverUrl: string, channelId: string, showSnackBar = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const {database} = operator;
        const channel = await getChannelById(database, channelId);
        if (!channel) {
            return {error: 'channel not found'};
        }

        const currentTeamId = await getCurrentTeamId(database);
        const teamId = channel?.teamId || currentTeamId;
        const currentCategory = await getChannelCategory(database, teamId, channelId);

        if (!currentCategory) {
            return {error: 'channel does not belong to a category'};
        }

        const categories = await queryCategoriesByTeamIds(database, [teamId]).fetch();
        const isFavorited = currentCategory.type === FAVORITES_CATEGORY;
        let targetWithChannels: CategoryWithChannels;
        let favoriteWithChannels: CategoryWithChannels;

        if (isFavorited) {
            const categoryType = (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) ? DMS_CATEGORY : CHANNELS_CATEGORY;
            const targetCategory = categories.find((c) => c.type === categoryType);
            if (!targetCategory) {
                return {error: 'target category not found'};
            }
            targetWithChannels = await targetCategory.toCategoryWithChannels();
            targetWithChannels.channel_ids.unshift(channelId);

            favoriteWithChannels = await currentCategory.toCategoryWithChannels();
            const channelIndex = favoriteWithChannels.channel_ids.indexOf(channelId);
            favoriteWithChannels.channel_ids.splice(channelIndex, 1);
        } else {
            const favoritesCategory = categories.find((c) => c.type === FAVORITES_CATEGORY);
            if (!favoritesCategory) {
                return {error: 'No favorites category'};
            }
            favoriteWithChannels = await favoritesCategory.toCategoryWithChannels();
            favoriteWithChannels.channel_ids.unshift(channelId);

            targetWithChannels = await currentCategory.toCategoryWithChannels();
            const channelIndex = targetWithChannels.channel_ids.indexOf(channelId);
            targetWithChannels.channel_ids.splice(channelIndex, 1);
        }

        await client.updateChannelCategories('me', teamId, [targetWithChannels, favoriteWithChannels]);

        if (showSnackBar) {
            const onUndo = () => toggleFavoriteChannel(serverUrl, channelId, false);
            showFavoriteChannelSnackbar(!isFavorited, onUndo);
        }

        return {data: true};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
