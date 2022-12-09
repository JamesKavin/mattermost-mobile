// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config, Preferences} from '@constants';
import {getPreferenceValue} from '@helpers/api/preference';
import {isMinimumServerVersion} from '@utils/helpers';

import type PreferenceModel from '@typings/database/models/servers/preference';

export function processIsCRTEnabled(preferences: PreferenceModel[]|PreferenceType[], configValue?: string, featureFlag?: string, version?: string): boolean {
    let preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_OFF;
    if (configValue === Config.DEFAULT_ON) {
        preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_ON;
    }
    const preference = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.COLLAPSED_REPLY_THREADS, preferenceDefault);

    // CRT Feature flag removed in 7.6
    const isFeatureFlagEnabled = version && isMinimumServerVersion(version, 7, 6) ? true : featureFlag === Config.TRUE;

    const isAllowed = (
        isFeatureFlagEnabled &&
        configValue !== Config.DISABLED
    );

    return isAllowed && (
        preference === Preferences.COLLAPSED_REPLY_THREADS_ON ||
        configValue === Config.ALWAYS_ON
    );
}

export const getThreadsListEdges = (threads: Thread[]) => {
    // Sort a clone of 'threads' array by last_reply_at
    const sortedThreads = [...threads].sort((a, b) => {
        return a.last_reply_at - b.last_reply_at;
    });

    const earliestThread = sortedThreads[0];
    const latestThread = sortedThreads[sortedThreads.length - 1];

    return {earliestThread, latestThread};
};
