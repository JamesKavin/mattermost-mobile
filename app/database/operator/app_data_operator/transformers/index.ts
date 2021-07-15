// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers';

import type {Model} from '@nozbe/watermelondb';

import type InfoModel from '@typings/database/models/app/info';
import type {TransformerArgs} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';
import type GlobalModel from '@typings/database/models/app/global';

const {INFO, GLOBAL} = MM_TABLES.APP;

/**
 * transformInfoRecord: Prepares a record of the APP database 'Info' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformInfoRecord = ({action, database, value}: TransformerArgs): Promise<Model> => {
    const raw = value.raw as AppInfo;
    const record = value.record as InfoModel;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (app: InfoModel) => {
        app._raw.id = isCreateAction ? app.id : record.id;
        app.buildNumber = raw?.build_number;
        app.createdAt = raw?.created_at;
        app.versionNumber = raw?.version_number;
    };

    return prepareBaseRecord({
        action,
        database,
        fieldsMapper,
        tableName: INFO,
        value,
    });
};

/**
 * transformGlobalRecord: Prepares a record of the APP database 'Global' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformGlobalRecord = ({action, database, value}: TransformerArgs): Promise<Model> => {
    const raw = value.raw as IdValue;

    const fieldsMapper = (global: GlobalModel) => {
        global._raw.id = raw?.id;
        global.value = raw?.value;
    };

    return prepareBaseRecord({
        action,
        database,
        fieldsMapper,
        tableName: GLOBAL,
        value,
    });
};

