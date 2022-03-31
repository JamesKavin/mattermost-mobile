// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {dismissBottomSheet, showModal} from '@screens/navigation';

import PlusMenuItem from './item';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
}

const PlusMenuList = ({canCreateChannels, canJoinChannels}: Props) => {
    const intl = useIntl();
    const theme = useTheme();

    const browseChannels = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'browse_channels.title', defaultMessage: 'More Channels'});
        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

        showModal(Screens.BROWSE_CHANNELS, title, {
            closeButton,
        });
    }, [intl, theme]);

    const createNewChannel = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'});
        showModal(Screens.CREATE_OR_EDIT_CHANNEL, title);
    }, [intl]);

    const openDirectMessage = useCallback(async () => {
        await dismissBottomSheet();

        const title = intl.formatMessage({id: 'create_direct_message.title', defaultMessage: 'Create Direct Message'});
        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        showModal(Screens.CREATE_DIRECT_MESSAGE, title, {
            closeButton,
        });
    }, [intl, theme]);

    return (
        <>
            {canJoinChannels &&
            <PlusMenuItem
                pickerAction='browseChannels'
                onPress={browseChannels}
            />
            }
            {canCreateChannels &&
            <PlusMenuItem
                pickerAction='createNewChannel'
                onPress={createNewChannel}
            />
            }
            <PlusMenuItem
                pickerAction='openDirectMessage'
                onPress={openDirectMessage}
            />
        </>
    );
};

export default PlusMenuList;
