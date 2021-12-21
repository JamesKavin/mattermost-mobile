// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordChannelMembershipEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelMembershipRecord,
    transformPreferenceRecord,
    transformReactionRecord,
    transformUserRecord,
} from '@database/operator/server_data_operator/transformers/user';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {sanitizeReactions} from '@database/operator/utils/reaction';

import type {
    HandleChannelMembershipArgs,
    HandlePreferencesArgs,
    HandleReactionsArgs,
    HandleUsersArgs,
} from '@typings/database/database';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type ReactionModel from '@typings/database/models/servers/reaction';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL_MEMBERSHIP,
    PREFERENCE,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

export interface UserHandlerMix {
    handleChannelMembership: ({channelMemberships, prepareRecordsOnly}: HandleChannelMembershipArgs) => Promise<ChannelMembershipModel[]>;
    handlePreferences: ({preferences, prepareRecordsOnly}: HandlePreferencesArgs) => Promise<PreferenceModel[]>;
    handleReactions: ({postsReactions, prepareRecordsOnly}: HandleReactionsArgs) => Promise<Array<ReactionModel | CustomEmojiModel>>;
    handleUsers: ({users, prepareRecordsOnly}: HandleUsersArgs) => Promise<UserModel[]>;
}

const UserHandler = (superclass: any) => class extends superclass {
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
            findMatchingRecordBy: isRecordChannelMembershipEqualToRaw,
            transformer: transformChannelMembershipRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: CHANNEL_MEMBERSHIP,
        });
    };

    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE table from the 'Server' schema
     * @param {HandlePreferencesArgs} preferencesArgs
     * @param {PreferenceType[]} preferencesArgs.preferences
     * @param {boolean} preferencesArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<PreferenceModel[]>}
     */
    handlePreferences = async ({preferences, prepareRecordsOnly = true, sync = false}: HandlePreferencesArgs): Promise<PreferenceModel[]> => {
        if (!preferences.length) {
            throw new DataOperatorException(
                'An empty "preferences" array has been passed to the handlePreferences method',
            );
        }

        // WE NEED TO SYNC THE PREFS FROM WHAT WE GOT AND WHAT WE HAVE
        const deleteValues: PreferenceModel[] = [];
        if (sync) {
            const stored = await this.database.get(PREFERENCE).query().fetch() as PreferenceModel[];
            for (const pref of stored) {
                const exists = preferences.findIndex((p) => p.category === pref.category && p.name === pref.name) > -1;
                if (!exists) {
                    pref.prepareDestroyPermanently();
                    deleteValues.push(pref);
                }
            }
        }

        const records: PreferenceModel[] = await this.handleRecords({
            fieldName: 'user_id',
            findMatchingRecordBy: isRecordPreferenceEqualToRaw,
            transformer: transformPreferenceRecord,
            prepareRecordsOnly: true,
            createOrUpdateRawValues: preferences,
            tableName: PREFERENCE,
        });

        if (deleteValues.length) {
            records.push(...deleteValues);
        }

        if (records.length && !prepareRecordsOnly) {
            await this.batchRecords(records);
        }

        return records;
    };

    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction table from the 'Server' schema
     * @param {HandleReactionsArgs} handleReactions
     * @param {ReactionsPerPost[]} handleReactions.reactions
     * @param {boolean} handleReactions.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<Array<(ReactionModel | CustomEmojiModel)>>}
     */
    handleReactions = async ({postsReactions, prepareRecordsOnly}: HandleReactionsArgs): Promise<ReactionModel[]> => {
        const batchRecords: ReactionModel[] = [];

        if (!postsReactions.length) {
            throw new DataOperatorException(
                'An empty "reactions" array has been passed to the handleReactions method',
            );
        }

        for await (const postReactions of postsReactions) {
            const {post_id, reactions} = postReactions;
            const rawValues = getUniqueRawsBy({raws: reactions, key: 'emoji_name'}) as Reaction[];
            const {
                createReactions,
                deleteReactions,
            } = await sanitizeReactions({
                database: this.database,
                post_id,
                rawReactions: rawValues,
            });

            if (createReactions?.length) {
                // Prepares record for model Reactions
                const reactionsRecords = (await this.prepareRecords({
                    createRaws: createReactions,
                    transformer: transformReactionRecord,
                    tableName: REACTION,
                })) as ReactionModel[];
                batchRecords.push(...reactionsRecords);
            }

            if (deleteReactions?.length) {
                batchRecords.push(...deleteReactions);
            }
        }

        if (prepareRecordsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchRecords(batchRecords);
        }

        return batchRecords;
    };

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User table from the 'Server' schema
     * @param {HandleUsersArgs} usersArgs
     * @param {UserProfile[]} usersArgs.users
     * @param {boolean} usersArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<UserModel[]>}
     */
    handleUsers = async ({users, prepareRecordsOnly = true}: HandleUsersArgs): Promise<UserModel[]> => {
        if (!users.length) {
            throw new DataOperatorException(
                'An empty "users" array has been passed to the handleUsers method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: users, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordUserEqualToRaw,
            transformer: transformUserRecord,
            createOrUpdateRawValues,
            tableName: USER,
            prepareRecordsOnly,
        });
    };
};

export default UserHandler;
