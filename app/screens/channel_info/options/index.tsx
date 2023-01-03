// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CopyChannelLinkOption from '@components/channel_actions/copy_channel_link_option';
import {General} from '@constants';
import {isTypeDMorGM} from '@utils/channel';

import EditChannel from './edit_channel';
import IgnoreMentions from './ignore_mentions';
import PinnedMessages from './pinned_messages';

// import Members from './members';

type Props = {
    channelId: string;
    type?: ChannelType;
    callsEnabled: boolean;
}

const Options = ({channelId, type, callsEnabled}: Props) => {
    const isDMorGM = isTypeDMorGM(type);

    return (
        <>
            {type !== General.DM_CHANNEL &&
                <IgnoreMentions channelId={channelId}/>
            }
            {/*<NotificationPreference channelId={channelId}/>*/}
            <PinnedMessages channelId={channelId}/>
            {/* Add back in after MM-47653 is resolved. https://mattermost.atlassian.net/browse/MM-47653
            {type !== General.DM_CHANNEL &&
                <Members channelId={channelId}/>
            }
            */}
            {callsEnabled && !isDMorGM && // if calls is not enabled, copy link will show in the channel actions
                <CopyChannelLinkOption
                    channelId={channelId}
                    testID='channel_info.options.copy_channel_link.option'
                />
            }
            {type !== General.DM_CHANNEL && type !== General.GM_CHANNEL &&
                <EditChannel channelId={channelId}/>
            }
        </>
    );
};

export default Options;
