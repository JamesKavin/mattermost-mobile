// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Database} from '@nozbe/watermelondb';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {GestureResponderEvent, Keyboard, StyleProp, StyleSheet, Text, TextStyle, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchUserOrGroupsByMentionsInBatch} from '@actions/remote/user';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {MM_TABLES} from '@constants/database';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import GroupModel from '@database/models/server/group';
import UserModel from '@database/models/server/user';
import {bottomSheet, dismissBottomSheet, openAsBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {displayUsername, getUsersByUsername} from '@utils/user';

import type GroupModelType from '@typings/database/models/servers/group';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type UserModelType from '@typings/database/models/servers/user';

type AtMentionProps = {
    channelId?: string;
    currentUserId: string;
    database: Database;
    disableAtChannelMentionHighlight?: boolean;
    isSearchResult?: boolean;
    location: string;
    mentionKeys?: Array<{key: string }>;
    mentionName: string;
    mentionStyle: TextStyle;
    onPostPress?: (e: GestureResponderEvent) => void;
    teammateNameDisplay: string;
    textStyle?: StyleProp<TextStyle>;
    users: UserModelType[];
    groups: GroupModel[];
    groupMemberships: GroupMembershipModel[];
}

const {SERVER: {GROUP, USER}} = MM_TABLES;

const style = StyleSheet.create({
    bottomSheet: {flex: 1},
});

const AtMention = ({
    channelId,
    currentUserId,
    database,
    disableAtChannelMentionHighlight,
    isSearchResult,
    location,
    mentionName,
    mentionKeys,
    mentionStyle,
    onPostPress,
    teammateNameDisplay,
    textStyle,
    users,
    groups,
    groupMemberships,
}: AtMentionProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();
    const serverUrl = useServerUrl();

    const user = useMemo(() => {
        const usersByUsername = getUsersByUsername(users);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (usersByUsername[mn]) {
                return usersByUsername[mn];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        // @ts-expect-error: The model constructor is hidden within WDB type definition
        return new UserModel(database.get(USER), {username: ''});
    }, [users, mentionName]);

    const userMentionKeys = useMemo(() => {
        if (mentionKeys) {
            return mentionKeys;
        }

        if (user.id !== currentUserId) {
            return [];
        }

        return user.mentionKeys;
    }, [currentUserId, mentionKeys, user]);

    // Checks if the mention is a group
    const group = useMemo(() => {
        if (user?.username) {
            return undefined;
        }
        const getGroupsByName = (gs: GroupModelType[]) => {
            const groupsByName: Dictionary<GroupModelType> = {};

            for (const g of gs) {
                groupsByName[g.name] = g;
            }

            return groupsByName;
        };

        const groupsByName = getGroupsByName(groups);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (groupsByName[mn]) {
                return groupsByName[mn];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        // @ts-expect-error: The model constructor is hidden within WDB type definition
        return new GroupModel(database.get(GROUP), {name: ''});
    }, [groups, user, mentionName]);

    // Effects
    useEffect(() => {
        // Fetches and updates the local db store with the mention
        if (!user.username && !group?.name) {
            fetchUserOrGroupsByMentionsInBatch(serverUrl, mentionName);
        }
    }, []);

    const openUserProfile = () => {
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {closeButtonId, location, userId: user.id, channelId};

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    };

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={style.bottomSheet}
                    >
                        <SlideUpPanelItem
                            icon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                let username = mentionName;
                                if (user.username) {
                                    username = user.username;
                                }

                                Clipboard.setString(`@${username}`);
                            }}
                            testID='at_mention.bottom_sheet.copy_mention'
                            text={intl.formatMessage({id: 'mobile.mention.copy_mention', defaultMessage: 'Copy Mention'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            icon='cancel'
                            onPress={() => {
                                dismissBottomSheet();
                            }}
                            testID='at_mention.bottom_sheet.cancel'
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            bottomSheet({
                closeButtonId: 'close-at-mention',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT, bottom)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig, intl, theme, bottom]);

    const mentionTextStyle = [];

    let backgroundColor;
    let canPress = false;
    let highlighted;
    let isMention = false;
    let mention;
    let onLongPress;
    let onPress: ((e?: GestureResponderEvent) => void) | undefined;
    let suffix;
    let suffixElement;
    let styleText;

    if (textStyle) {
        backgroundColor = theme.mentionHighlightBg;
        styleText = textStyle;
    }

    if (user?.username) {
        suffix = mentionName.substring(user.username.length);
        highlighted = userMentionKeys.some((item) => item.key.includes(user.username));
        mention = displayUsername(user, user.locale, teammateNameDisplay);
        isMention = true;
        canPress = true;
    } else if (group?.name) {
        mention = group.name;
        highlighted = groupMemberships.some((gm) => gm.groupId === group.id);
        isMention = true;
        canPress = false;
    } else {
        const pattern = new RegExp(/\b(all|channel|here)(?:\.\B|_\b|\b)/, 'i');
        const mentionMatch = pattern.exec(mentionName);

        if (mentionMatch && !disableAtChannelMentionHighlight) {
            mention = mentionMatch.length > 1 ? mentionMatch[1] : mentionMatch[0];
            suffix = mentionName.replace(mention, '');
            isMention = true;
            highlighted = true;
        } else {
            mention = mentionName;
        }
    }

    if (canPress) {
        onLongPress = handleLongPress;
        onPress = (isSearchResult ? onPostPress : openUserProfile);
    }

    if (suffix) {
        const suffixStyle = {...StyleSheet.flatten(styleText), color: theme.centerChannelColor};
        suffixElement = (
            <Text style={suffixStyle}>
                {suffix}
            </Text>
        );
    }

    if (isMention) {
        mentionTextStyle.push(mentionStyle);
    }

    if (highlighted) {
        mentionTextStyle.push({backgroundColor, color: theme.mentionHighlightLink});
    }

    return (
        <Text
            onPress={onPress}
            onLongPress={onLongPress}
            style={styleText}
        >
            <Text style={mentionTextStyle}>
                {'@' + mention}
            </Text>
            {suffixElement}
        </Text>
    );
};

export default AtMention;
