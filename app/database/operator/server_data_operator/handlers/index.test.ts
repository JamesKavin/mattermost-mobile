// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperatorException from '@database/exceptions/data_operator_exception';
import DatabaseManager from '@database/manager';
import {
    isRecordCustomEmojiEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordSystemEqualToRaw,
    isRecordTermsOfServiceEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
    transformTermsOfServiceRecord,
} from '@database/operator/server_data_operator/transformers/general';

import type {Model} from '@nozbe/watermelondb';

import type ServerDataOperator from '..';

describe('*** DataOperator: Base Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleRole: should write to the ROLE table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const roles: Role[] = [
            {
                id: 'custom-role-id-1',
                name: 'custom-role-1',
                permissions: ['custom-permission-1'],
            },
        ];

        await operator.handleRole({
            roles,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformRoleRecord,
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            createOrUpdateRawValues: roles,
            tableName: 'Role',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleCustomEmojis: should write to the CUSTOM_EMOJI table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const emojis: CustomEmoji[] = [
            {
                id: 'i',
                create_at: 1580913641769,
                update_at: 1580913641769,
                delete_at: 0,
                creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                name: 'boomI',
            },
        ];

        await operator.handleCustomEmojis({
            emojis,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: emojis,
            tableName: 'CustomEmoji',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            transformer: transformCustomEmojiRecord,
        });
    });

    it('=> HandleSystem: should write to the SYSTEM table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const systems = [{id: 'system-1', value: 'system-1'}];

        await operator.handleSystem({
            systems,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            fieldName: 'id',
            transformer: transformSystemRecord,
            createOrUpdateRawValues: systems,
            tableName: 'System',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleTermsOfService: should write to the TERMS_OF_SERVICE table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const termOfService: TermsOfService[] = [
            {
                id: 'tos-1',
                accepted_at: 1,
                create_at: 1613667352029,
                user_id: 'user1613667352029',
                text: '',
            },
        ];

        await operator.handleTermOfService({
            termOfService,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordTermsOfServiceEqualToRaw,
            fieldName: 'id',
            transformer: transformTermsOfServiceRecord,
            createOrUpdateRawValues: termOfService,
            tableName: 'TermsOfService',
            prepareRecordsOnly: false,
        });
    });

    it('=> No table name: should not call execute if tableName is invalid', async () => {
        expect.assertions(3);

        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const findMatchingRecordBy = (existing: Model, newRecord: any) => {
            return existing === newRecord;
        };

        const transformer = async (model: Model) => model;

        await expect(
            operator?.handleRecords({
                fieldName: 'invalidField',
                tableName: 'INVALID_TABLE_NAME',
                findMatchingRecordBy,
                transformer,
                createOrUpdateRawValues: [{id: 'tos-1', value: '1'}],
                prepareRecordsOnly: false,
            }),
        ).rejects.toThrow(DataOperatorException);
    });
});
