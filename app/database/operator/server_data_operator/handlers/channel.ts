// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    buildMyChannelKey,
    buildChannelMembershipKey,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelInfoRecord,
    transformChannelMembershipRecord,
    transformChannelRecord,
    transformMyChannelRecord,
    transformMyChannelSettingsRecord,
} from '@database/operator/server_data_operator/transformers/channel';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {HandleChannelArgs, HandleChannelInfoArgs, HandleChannelMembershipArgs, HandleMyChannelArgs, HandleMyChannelSettingsArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';

const {
    CHANNEL,
    CHANNEL_INFO,
    CHANNEL_MEMBERSHIP,
    MY_CHANNEL,
    MY_CHANNEL_SETTINGS,
} = MM_TABLES.SERVER;

export interface ChannelHandlerMix {
  handleChannel: ({channels, prepareRecordsOnly}: HandleChannelArgs) => Promise<ChannelModel[]>;
  handleChannelMembership: ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => Promise<ChannelMembershipModel[]>;
  handleMyChannelSettings: ({settings, prepareRecordsOnly}: HandleMyChannelSettingsArgs) => Promise<MyChannelSettingsModel[]>;
  handleChannelInfo: ({channelInfos, prepareRecordsOnly}: HandleChannelInfoArgs) => Promise<ChannelInfoModel[]>;
  handleMyChannel: ({channels, myChannels, prepareRecordsOnly}: HandleMyChannelArgs) => Promise<MyChannelModel[]>;
}

const ChannelHandler = (superclass: any) => class extends superclass {
    /**
     * handleChannel: Handler responsible for the Create/Update operations occurring on the CHANNEL table from the 'Server' schema
     * @param {HandleChannelArgs} channelsArgs
     * @param {RawChannel[]} channelsArgs.channels
     * @param {boolean} channelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelModel[]>}
     */
    handleChannel = ({channels, prepareRecordsOnly = true}: HandleChannelArgs): Promise<ChannelModel[]> => {
        if (!channels.length) {
            throw new DataOperatorException(
                'An empty "channels" array has been passed to the handleChannel method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: channels, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL,
        });
    };

    /**
     * handleMyChannelSettings: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL_SETTINGS table from the 'Server' schema
     * @param {HandleMyChannelSettingsArgs} settingsArgs
     * @param {RawMyChannelSettings[]} settingsArgs.settings
     * @param {boolean} settingsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<MyChannelSettingsModel[]>}
     */
    handleMyChannelSettings = ({settings, prepareRecordsOnly = true}: HandleMyChannelSettingsArgs): Promise<MyChannelSettingsModel[]> => {
        if (!settings.length) {
            throw new DataOperatorException(
                'An empty "settings" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: settings, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelSettingsRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL_SETTINGS,
        });
    };

    /**
     * handleChannelInfo: Handler responsible for the Create/Update operations occurring on the CHANNEL_INFO table from the 'Server' schema
     * @param {HandleChannelInfoArgs} channelInfosArgs
     * @param {RawChannelInfo[]} channelInfosArgs.channelInfos
     * @param {boolean} channelInfosArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelInfoModel[]>}
     */
    handleChannelInfo = ({channelInfos, prepareRecordsOnly = true}: HandleChannelInfoArgs): Promise<ChannelInfoModel[]> => {
        if (!channelInfos.length) {
            throw new DataOperatorException(
                'An empty "channelInfos" array has been passed to the handleMyChannelSettings method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: channelInfos as ChannelInfo[],
            key: 'id',
        });

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformChannelInfoRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_INFO,
        });
    };

    /**
     * handleMyChannel: Handler responsible for the Create/Update operations occurring on the MY_CHANNEL table from the 'Server' schema
     * @param {HandleMyChannelArgs} myChannelsArgs
     * @param {RawMyChannel[]} myChannelsArgs.myChannels
     * @param {boolean} myChannelsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<MyChannelModel[]>}
     */
    handleMyChannel = ({channels, myChannels, prepareRecordsOnly = true}: HandleMyChannelArgs): Promise<MyChannelModel[]> => {
        if (!myChannels.length) {
            throw new DataOperatorException(
                'An empty "myChannels" array has been passed to the handleMyChannel method',
            );
        }

        const channelMap = channels.reduce((result: Record<string, Channel>, channel) => {
            result[channel.id] = channel;
            return result;
        }, {});
        for (const my of myChannels) {
            const channel = channelMap[my.channel_id];
            if (channel) {
                const msgCount = Math.max(0, channel.total_msg_count - my.msg_count);
                my.msg_count = msgCount;
                my.is_unread = msgCount > 0;
            }
        }

        const createOrUpdateRawValues = getUniqueRawsBy({
            raws: myChannels,
            key: 'id',
        });

        return this.handleRecords({
            fieldName: 'id',
            buildKeyRecordBy: buildMyChannelKey,
            transformer: transformMyChannelRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: MY_CHANNEL,
        });
    };

    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP table from the 'Server' schema
     * @param {HandleChannelMembershipArgs} channelMembershipsArgs
     * @param {ChannelMembership[]} channelMembershipsArgs.channelMemberships
     * @param {boolean} channelMembershipsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<ChannelMembershipModel[]>}
     */
    handleChannelMembership = ({channelMemberships, prepareRecordsOnly = true}: HandleChannelMembershipArgs): Promise<ChannelMembershipModel[]> => {
        if (!channelMemberships.length) {
            throw new DataOperatorException(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );
        }

        const memberships: ChannelMember[] = channelMemberships.map((m) => ({
            id: `${m.channel_id}-${m.user_id}`,
            ...m,
        }));

        const createOrUpdateRawValues = getUniqueRawsBy({raws: memberships, key: 'id'});

        return this.handleRecords({
            fieldName: 'user_id',
            buildKeyRecordBy: buildChannelMembershipKey,
            transformer: transformChannelMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_MEMBERSHIP,
        });
    };
};

export default ChannelHandler;
