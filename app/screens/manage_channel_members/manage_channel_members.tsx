// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {fetchChannelMemberships} from '@actions/remote/channel';
import {fetchUsersByIds, searchProfiles} from '@actions/remote/user';
import Search from '@components/search';
import UserList from '@components/user_list';
import {Events, General, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {openAsBottomSheet, setButtons} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {showRemoveChannelUserSnackbar} from '@utils/snack_bar';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {filterProfilesMatchingTerm} from '@utils/user';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    canManageAndRemoveMembers: boolean;
    channelId: string;
    componentId: AvailableScreens;
    currentTeamId: string;
    currentUserId: string;
    tutorialWatched: boolean;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        marginLeft: 12,
        marginRight: Platform.select({ios: 4, default: 12}),
        marginVertical: 12,
    },
});

const messages = defineMessages({
    button_manage: {
        id: t('mobile.manage_members.manage'),
        defaultMessage: 'Manage',
    },
    button_done: {
        id: t('mobile.manage_members.done'),
        defaultMessage: 'Done',
    },
});

const MANAGE_BUTTON = 'manage-button';
const EMPTY: UserProfile[] = [];
const EMPTY_MEMBERS: ChannelMembership[] = [];
const EMPTY_IDS = {};
const {USER_PROFILE} = Screens;
const CLOSE_BUTTON_ID = 'close-user-profile';

export default function ManageChannelMembers({
    canManageAndRemoveMembers,
    channelId,
    componentId,
    currentTeamId,
    currentUserId,
    tutorialWatched,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const {formatMessage} = useIntl();

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const mounted = useRef(false);

    const [isManageMode, setIsManageMode] = useState(false);
    const [profiles, setProfiles] = useState<UserProfile[]>(EMPTY);
    const [channelMembers, setChannelMembers] = useState<ChannelMembership[]>(EMPTY_MEMBERS);
    const [searchResults, setSearchResults] = useState<UserProfile[]>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [term, setTerm] = useState('');

    const loadedProfiles = (users: UserProfile[], members: ChannelMembership[]) => {
        if (mounted.current) {
            setLoading(false);
            setProfiles(users);
            setChannelMembers(members);
        }
    };

    const clearSearch = useCallback(() => {
        setTerm('');
        setSearchResults(EMPTY);
    }, []);

    const getProfiles = useCallback(debounce(async () => {
        const hasTerm = Boolean(term);
        if (!loading && !hasTerm && mounted.current) {
            setLoading(true);
            const options = {sort: 'admin', active: true};
            const {users, members} = await fetchChannelMemberships(serverUrl, channelId, options, true);
            if (users.length) {
                loadedProfiles(users, members);
            }
            setLoading(false);
        }
    }, 100), [channelId, loading, serverUrl, term]);

    const handleSelectProfile = useCallback(async (profile: UserProfile) => {
        await fetchUsersByIds(serverUrl, [profile.id]);
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const props = {
            channelId,
            closeButtonId: CLOSE_BUTTON_ID,
            location: USER_PROFILE,
            manageMode: isManageMode,
            userId: profile.id,
            canManageAndRemoveMembers,
        };

        Keyboard.dismiss();
        openAsBottomSheet({screen: USER_PROFILE, title, theme, closeButtonId: CLOSE_BUTTON_ID, props});
    }, [canManageAndRemoveMembers, channelId, isManageMode]);

    const searchUsers = useCallback(async (searchTerm: string) => {
        const lowerCasedTerm = searchTerm.toLowerCase();
        setLoading(true);

        const options: SearchUserOptions = {team_id: currentTeamId, in_channel_id: channelId, allow_inactive: false};
        const {data = EMPTY} = await searchProfiles(serverUrl, lowerCasedTerm, options);

        setSearchResults(data);
        setLoading(false);
    }, [serverUrl, channelId, currentTeamId]);

    const search = useCallback(() => {
        searchUsers(term);
    }, [searchUsers, term]);

    const onSearch = useCallback((text: string) => {
        if (!text) {
            clearSearch();
            return;
        }

        setTerm(text);
        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(() => {
            searchUsers(text);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [searchUsers, clearSearch]);

    const updateNavigationButtons = useCallback((manage: boolean) => {
        setButtons(componentId, {
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                enabled: true,
                id: MANAGE_BUTTON,
                showAsAction: 'always',
                testID: 'manage_members.button',
                text: formatMessage(manage ? messages.button_done : messages.button_manage),
            }],
        });
    }, [theme.sidebarHeaderTextColor]);

    const toggleManageEnabled = useCallback(() => {
        updateNavigationButtons(!isManageMode);
        setIsManageMode((prev) => !prev);
    }, [isManageMode, updateNavigationButtons]);

    const handleRemoveUser = useCallback(async (userId: string) => {
        const pIndex = profiles.findIndex((user) => user.id === userId);
        const mIndex = channelMembers.findIndex((m) => m.user_id === userId);
        if (pIndex !== -1) {
            const newProfiles = [...profiles];
            newProfiles.splice(pIndex, 1);
            setProfiles(newProfiles);

            const newMembers = [...channelMembers];
            newMembers.splice(mIndex, 1);
            setChannelMembers(newMembers);

            await NavigationStore.waitUntilScreensIsRemoved(USER_PROFILE);
            showRemoveChannelUserSnackbar();
        }
    }, [profiles, channelMembers]);

    const handleUserChangeRole = useCallback(async ({userId, schemeAdmin}: {userId: string; schemeAdmin: boolean}) => {
        const clone = channelMembers.map((m) => {
            if (m.user_id === userId) {
                m.scheme_admin = schemeAdmin;
                return m;
            }
            return m;
        });

        setChannelMembers(clone);
    }, [channelMembers]);

    const data = useMemo(() => {
        const isSearch = Boolean(term);
        if (isSearch) {
            return filterProfilesMatchingTerm(searchResults, term);
        }
        return profiles;
    }, [term, searchResults, profiles]);

    useNavButtonPressed(MANAGE_BUTTON, componentId, toggleManageEnabled, [toggleManageEnabled]);

    useEffect(() => {
        mounted.current = true;
        getProfiles();
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (canManageAndRemoveMembers) {
            updateNavigationButtons(false);
        }
    }, [canManageAndRemoveMembers]);

    useEffect(() => {
        const removeUserListener = DeviceEventEmitter.addListener(Events.REMOVE_USER_FROM_CHANNEL, handleRemoveUser);
        const changeUserRoleListener = DeviceEventEmitter.addListener(Events.MANAGE_USER_CHANGE_ROLE, handleUserChangeRole);
        return (() => {
            removeUserListener?.remove();
            changeUserRoleListener?.remove();
        });
    }, [handleRemoveUser, handleUserChangeRole]);

    return (
        <SafeAreaView
            style={styles.container}
            testID='manage_members.screen'
        >
            <View style={styles.searchBar}>
                <Search
                    autoCapitalize='none'
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    onCancel={clearSearch}
                    onChangeText={onSearch}
                    onSubmitEditing={search}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    testID='manage_members.search_bar'
                    value={term}
                />
            </View>

            {/* TODO: https://mattermost.atlassian.net/browse/MM-48830 */}
            {/* fix flashing No Results page when results are present */}
            <UserList
                currentUserId={currentUserId}
                handleSelectProfile={handleSelectProfile}
                loading={loading}
                manageMode={true} // default true to change row select icon to a dropdown
                profiles={data}
                channelMembers={channelMembers}
                selectedIds={EMPTY_IDS}
                showManageMode={canManageAndRemoveMembers && isManageMode}
                showNoResults={!loading}
                term={term}
                testID='manage_members.user_list'
                tutorialWatched={tutorialWatched}
            />
        </SafeAreaView>
    );
}
