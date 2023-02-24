// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';

import {savePreference} from '@actions/remote/preference';
import SettingContainer from '@components/settings/container';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';

import CustomTheme from './custom_theme';
import {ThemeTiles} from './theme_tiles';

import type {AvailableScreens} from '@typings/screens/navigation';

type DisplayThemeProps = {
    allowedThemeKeys: string[];
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
}
const DisplayTheme = ({allowedThemeKeys, componentId, currentTeamId, currentUserId}: DisplayThemeProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const initialTheme = useMemo(() => theme.type, [/* dependency array should remain empty */]);

    const close = () => popTopScreen(componentId);

    const setThemePreference = useCallback((newTheme?: string) => {
        const allowedTheme = allowedThemeKeys.find((tk) => tk === newTheme);
        const differentTheme = initialTheme?.toLowerCase() !== newTheme?.toLowerCase();

        if (!allowedTheme || !differentTheme) {
            close();
            return;
        }

        const pref: PreferenceType = {
            category: Preferences.CATEGORIES.THEME,
            name: currentTeamId,
            user_id: currentUserId,
            value: JSON.stringify(Preferences.THEMES[allowedTheme as ThemeKey]),
        };
        savePreference(serverUrl, [pref]);
    }, [allowedThemeKeys, currentTeamId, initialTheme, serverUrl]);

    useAndroidHardwareBackHandler(componentId, setThemePreference);

    return (
        <SettingContainer testID='theme_display_settings'>
            <ThemeTiles
                allowedThemeKeys={allowedThemeKeys}
                onThemeChange={setThemePreference}
                selectedTheme={initialTheme}
            />
            {theme.type === 'custom' && (
                <CustomTheme
                    setTheme={setThemePreference}
                    displayTheme={initialTheme}
                />
            )}
        </SettingContainer>
    );
};

export default DisplayTheme;
