// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {makeCallsBaseAndBadgeRGB, rgbToCSS} from '@mattermost/calls/lib/utils';
import {Alert} from 'react-native';

import {Calls, Post} from '@constants';
import {isMinimumServerVersion} from '@utils/helpers';
import {displayUsername} from '@utils/user';

import type {CallParticipant, CallsTheme} from '@calls/types/calls';
import type {CallsConfig} from '@mattermost/calls/lib/types';
import type PostModel from '@typings/database/models/servers/post';
import type {IntlShape} from 'react-intl';
import type {RTCIceServer} from 'react-native-webrtc';

export function sortParticipants(locale: string, teammateNameDisplay: string, participants?: Dictionary<CallParticipant>, presenterID?: string): CallParticipant[] {
    if (!participants) {
        return [];
    }

    const users = Object.values(participants);

    return users.sort(sortByName(locale, teammateNameDisplay)).sort(sortByState(presenterID));
}

const sortByName = (locale: string, teammateNameDisplay: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        const nameA = displayUsername(a.userModel, locale, teammateNameDisplay);
        const nameB = displayUsername(b.userModel, locale, teammateNameDisplay);
        return nameA.localeCompare(nameB);
    };
};

const sortByState = (presenterID?: string) => {
    return (a: CallParticipant, b: CallParticipant) => {
        if (a.id === presenterID) {
            return -1;
        } else if (b.id === presenterID) {
            return 1;
        }

        if (a.raisedHand && !b.raisedHand) {
            return -1;
        } else if (b.raisedHand && !a.raisedHand) {
            return 1;
        } else if (a.raisedHand && b.raisedHand) {
            return a.raisedHand - b.raisedHand;
        }

        if (!a.muted && b.muted) {
            return -1;
        } else if (!b.muted && a.muted) {
            return 1;
        }

        return 0;
    };
};

export function getHandsRaised(participants: Dictionary<CallParticipant>) {
    return Object.values(participants).filter((p) => p.raisedHand);
}

export function getHandsRaisedNames(participants: CallParticipant[], currentUserId: string, locale: string, teammateNameDisplay: string, intl: IntlShape) {
    return participants.sort((a, b) => a.raisedHand - b.raisedHand).map((p) => {
        if (p.id === currentUserId) {
            return intl.formatMessage({id: 'mobile.calls_you_2', defaultMessage: 'You'});
        }
        return displayUsername(p.userModel, locale, teammateNameDisplay);
    });
}

export function isSupportedServerCalls(serverVersion?: string) {
    if (serverVersion) {
        return isMinimumServerVersion(
            serverVersion,
            Calls.RequiredServer.MAJOR_VERSION,
            Calls.RequiredServer.MIN_VERSION,
            Calls.RequiredServer.PATCH_VERSION,
        );
    }

    return false;
}

export function isCallsCustomMessage(post: PostModel | Post): boolean {
    return Boolean(post.type && post.type === Post.POST_TYPES.CUSTOM_CALLS);
}

export function idsAreEqual(a: string[], b: string[]) {
    if (a.length !== b.length) {
        return false;
    }

    // We can assume ids are unique
    // Doing a quick search indicated objects are tuned better than Map or Set
    const obj = a.reduce((prev, cur) => {
        prev[cur] = true;
        return prev;
    }, {} as Record<string, boolean>);

    for (let i = 0; i < b.length; i++) {
        if (!obj.hasOwnProperty(b[i])) {
            return false;
        }
    }
    return true;
}

export function errorAlert(error: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'mobile.calls_error_title',
            defaultMessage: 'Error',
        }),
        intl.formatMessage({
            id: 'mobile.calls_error_message',
            defaultMessage: 'Error: {error}',
        }, {error}),
    );
}

export function getICEServersConfigs(config: CallsConfig): RTCIceServer[] {
    // if ICEServersConfigs is set, we can trust this to be complete and
    // coming from an updated API.
    if (config.ICEServersConfigs && config.ICEServersConfigs.length > 0) {
        return config.ICEServersConfigs;
    }

    // otherwise we revert to using the now deprecated field.
    if (config.ICEServers && config.ICEServers.length > 0) {
        return [
            {
                urls: config.ICEServers,
            },
        ];
    }

    return [];
}

export function makeCallsTheme(theme: Theme): CallsTheme {
    const {baseColorRGB, badgeBgRGB} = makeCallsBaseAndBadgeRGB(theme.sidebarBg);

    const newTheme = {...theme} as CallsTheme;
    newTheme.callsBg = rgbToCSS(baseColorRGB);
    newTheme.callsBgRgb = `${baseColorRGB.r},${baseColorRGB.g},${baseColorRGB.b}`;
    newTheme.callsBadgeBg = rgbToCSS(badgeBgRGB);

    return newTheme;
}
