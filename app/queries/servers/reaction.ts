// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ReactionModel from '@typings/database/models/servers/reaction';
const {SERVER: {REACTION}} = MM_TABLES;

export const queryReaction = (database: Database, emojiName: string, postId: string, userId: string) => {
    return database.get<ReactionModel>(REACTION).query(
        Q.where('emoji_name', emojiName),
        Q.where('post_id', postId),
        Q.where('user_id', userId),
    );
};
