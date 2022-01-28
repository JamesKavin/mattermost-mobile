// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type WebsocketBroadcast = {
    omit_users: Dictionary<boolean>;
    user_id: string;
    channel_id: string;
    team_id: string;
}

type WebSocketMessage = {
    event: string;
    data: any;
    broadcast: WebsocketBroadcast;
    seq: number;
}
