// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import mtz from 'moment-timezone';
import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchTeamAndChannelMembership} from '@actions/remote/user';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {getLocaleFromLanguage} from '@i18n';
import BottomSheet from '@screens/bottom_sheet';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {getUserCustomStatus, getUserTimezone, isCustomStatusExpired} from '@utils/user';

import UserProfileCustomStatus from './custom_status';
import UserProfileLabel from './label';
import UserProfileOptions, {OptionsType} from './options';
import UserProfileTitle from './title';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId?: string;
    closeButtonId: string;
    currentUserId: string;
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    isChannelAdmin: boolean;
    isCustomStatusEnabled: boolean;
    isDirectMessage: boolean;
    isMilitaryTime: boolean;
    isSystemAdmin: boolean;
    isTeamAdmin: boolean;
    location: string;
    teamId: string;
    teammateDisplayName: string;
    user: UserModel;
    userIconOverride?: string;
    usernameOverride?: string;
}

const TITLE_HEIGHT = 118;
const OPTIONS_HEIGHT = 82;
const SINGLE_OPTION_HEIGHT = 68;
const LABEL_HEIGHT = 58;

const UserProfile = ({
    channelId, closeButtonId, currentUserId, enablePostIconOverride, enablePostUsernameOverride,
    isChannelAdmin, isCustomStatusEnabled, isDirectMessage, isMilitaryTime, isSystemAdmin, isTeamAdmin,
    location, teamId, teammateDisplayName,
    user, userIconOverride, usernameOverride,
}: Props) => {
    const {formatMessage, locale} = useIntl();
    const serverUrl = useServerUrl();
    const {bottom} = useSafeAreaInsets();
    const channelContext = [Screens.CHANNEL, Screens.THREAD].includes(location);
    const showOptions: OptionsType = channelContext && !user.isBot ? 'all' : 'message';
    const override = Boolean(userIconOverride || usernameOverride);
    const timezone = getUserTimezone(user);
    const customStatus = getUserCustomStatus(user);
    let localTime: string|undefined;

    if (timezone) {
        moment.locale(getLocaleFromLanguage(locale).toLowerCase());
        let format = 'H:mm';
        if (!isMilitaryTime) {
            const localeFormat = moment.localeData().longDateFormat('LT');
            format = localeFormat?.includes('A') ? localeFormat : 'h:mm A';
        }
        localTime = mtz.tz(Date.now(), timezone).format(format);
    }

    const showCustomStatus = isCustomStatusEnabled && Boolean(customStatus) && !user.isBot && !isCustomStatusExpired(user);
    const showUserProfileOptions = (!isDirectMessage || !channelContext) && !override;
    const showNickname = Boolean(user.nickname) && !override && !user.isBot;
    const showPosition = Boolean(user.position) && !override && !user.isBot;
    const showLocalTime = Boolean(localTime) && !override && !user.isBot;

    const snapPoints = useMemo(() => {
        let title = TITLE_HEIGHT;
        if (showUserProfileOptions) {
            title += showOptions === 'all' ? OPTIONS_HEIGHT : SINGLE_OPTION_HEIGHT;
        }

        let labels = 0;
        if (showCustomStatus) {
            labels += 1;
        }

        if (showNickname) {
            labels += 1;
        }

        if (showPosition) {
            labels += 1;
        }

        if (showLocalTime) {
            labels += 1;
        }

        return [
            1,
            bottomSheetSnapPoint(labels, LABEL_HEIGHT, bottom) + title,
        ];
    }, [
        showUserProfileOptions, showCustomStatus, showNickname,
        showPosition, showLocalTime, bottom,
    ]);

    useEffect(() => {
        if (currentUserId !== user.id) {
            fetchTeamAndChannelMembership(serverUrl, user.id, teamId, channelId);
        }
    }, []);

    const renderContent = () => {
        return (
            <>
                <UserProfileTitle
                    enablePostIconOverride={enablePostIconOverride}
                    enablePostUsernameOverride={enablePostUsernameOverride}
                    isChannelAdmin={isChannelAdmin}
                    isSystemAdmin={isSystemAdmin}
                    isTeamAdmin={isTeamAdmin}
                    teammateDisplayName={teammateDisplayName}
                    user={user}
                    userIconOverride={userIconOverride}
                    usernameOverride={usernameOverride}
                />
                {showUserProfileOptions &&
                    <UserProfileOptions
                        location={location}
                        type={showOptions}
                        username={user.username}
                        userId={user.id}
                    />
                }
                {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
                {showNickname &&
                <UserProfileLabel
                    description={user.nickname}
                    testID='user_profile.nickname'
                    title={formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'})}
                />
                }
                {showPosition &&
                <UserProfileLabel
                    description={user.position}
                    testID='user_profile.position'
                    title={formatMessage({id: 'channel_info.position', defaultMessage: 'Position'})}
                />
                }
                {showLocalTime &&
                <UserProfileLabel
                    description={localTime!}
                    testID='user_profile.local_time'
                    title={formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'})}
                />
                }
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId={closeButtonId}
            componentId={Screens.USER_PROFILE}
            initialSnapIndex={1}
            snapPoints={snapPoints}
            testID='user_profile'
        />
    );
};

export default UserProfile;
