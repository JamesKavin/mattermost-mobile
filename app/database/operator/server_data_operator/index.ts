// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';
import ChannelHandler, {ChannelHandlerMix} from '@database/operator/server_data_operator/handlers/channel';
import GroupHandler, {GroupHandlerMix} from '@database/operator/server_data_operator/handlers/group';
import PostHandler, {PostHandlerMix} from '@database/operator/server_data_operator/handlers/post';
import TeamHandler, {TeamHandlerMix} from '@database/operator/server_data_operator/handlers/team';
import UserHandler, {UserHandlerMix} from '@database/operator/server_data_operator/handlers/user';
import mix from '@utils/mix';

import type {Database} from '@nozbe/watermelondb';

interface ServerDataOperator extends ServerDataOperatorBase, PostHandlerMix, UserHandlerMix, GroupHandlerMix, ChannelHandlerMix, TeamHandlerMix {}

class ServerDataOperator extends mix(ServerDataOperatorBase).with(
    ChannelHandler,
    GroupHandler,
    PostHandler,
    TeamHandler,
    UserHandler,
) {
    // eslint-disable-next-line no-useless-constructor
    constructor(database: Database) {
        super(database);
    }
}

export default ServerDataOperator;
