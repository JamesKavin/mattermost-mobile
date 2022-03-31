// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {IntlShape} from 'react-intl';

import {Channel, General, Permissions} from '@constants';
import {t, DEFAULT_LOCALE} from '@i18n';
import {hasPermission} from '@utils/role';

import {generateId} from '../general';
import {cleanUpUrlable} from '../url';

import type ChannelModel from '@typings/database/models/servers/channel';

export function getDirectChannelName(id: string, otherId: string): string {
    let handle;

    if (otherId > id) {
        handle = id + '__' + otherId;
    } else {
        handle = otherId + '__' + id;
    }

    return handle;
}

export function selectDefaultChannelForTeam<T extends Channel|ChannelModel>(channels: T[], memberships: ChannelMembership[], teamId: string, roles?: Role[], locale = DEFAULT_LOCALE) {
    let channel: T|undefined;
    let canIJoinPublicChannelsInTeam = false;

    if (roles) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }
    const defaultChannel = channels?.find((c) => c.name === General.DEFAULT_CHANNEL);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && memberships?.find((m) => m.channel_id === defaultChannel.id));
    const myFirstTeamChannel = channels?.filter((c) =>
        (('team_id' in c) ? c.team_id : c.teamId) === teamId &&
        c.type === General.OPEN_CHANNEL &&
        Boolean(memberships?.find((m) => c.id === m.channel_id),
        )).sort(sortChannelsByDisplayName.bind(null, locale))[0];

    if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
}

export function sortChannelsByDisplayName<T extends Channel|ChannelModel>(locale: string, a: T, b: T): number {
    // if both channels have the display_name defined
    const aDisplayName = 'display_name' in a ? a.display_name : a.displayName;
    const bDisplayName = 'display_name' in b ? b.display_name : b.displayName;
    if (aDisplayName && bDisplayName && aDisplayName !== bDisplayName) {
        return aDisplayName.toLowerCase().localeCompare(bDisplayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}

export function sortChannelsModelByDisplayName(locale: string, a: ChannelModel, b: ChannelModel): number {
    // if both channels have the display_name defined
    if (a.displayName && b.displayName && a.displayName !== b.displayName) {
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}

const displayNameValidationMessages = {
    display_name_required: {
        id: t('mobile.rename_channel.display_name_required'),
        defaultMessage: 'Channel name is required',
    },
    display_name_maxLength: {
        id: t('mobile.rename_channel.display_name_maxLength'),
        defaultMessage: 'Channel name must be less than {maxLength, number} characters',
    },
    display_name_minLength: {
        id: t('mobile.rename_channel.display_name_minLength'),
        defaultMessage: 'Channel name must be {minLength, number} or more characters',
    },
};

export const validateDisplayName = (intl: IntlShape, displayName: string): {error: string} => {
    let errorMessage;
    switch (true) {
        case !displayName:
            errorMessage = intl.formatMessage(displayNameValidationMessages.display_name_required);
            break;
        case displayName.length > Channel.MAX_CHANNEL_NAME_LENGTH:
            errorMessage = intl.formatMessage(
                displayNameValidationMessages.display_name_maxLength,
                {maxLength: Channel.MAX_CHANNEL_NAME_LENGTH});
            break;
        case displayName.length < Channel.MIN_CHANNEL_NAME_LENGTH:
            errorMessage = intl.formatMessage(
                displayNameValidationMessages.display_name_minLength,
                {minLength: Channel.MIN_CHANNEL_NAME_LENGTH});
            break;

        default:
            errorMessage = '';
    }
    return {error: errorMessage};
};

export function generateChannelNameFromDisplayName(displayName: string) {
    let name = cleanUpUrlable(displayName);
    if (name === '') {
        name = generateId();
    }
    return name;
}
