// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';
import type {ConfigurationParamWithUrls, ConfigurationParamWithUrl} from 'react-native-webrtc';

export type GlobalCallsState = {
    micPermissionsGranted: boolean;
}

export const DefaultGlobalCallsState: GlobalCallsState = {
    micPermissionsGranted: false,
};

export type CallsState = {
    serverUrl: string;
    myUserId: string;
    calls: Dictionary<Call>;
    enabled: Dictionary<boolean>;
}

export const DefaultCallsState: CallsState = {
    serverUrl: '',
    myUserId: '',
    calls: {},
    enabled: {},
};

export type Call = {
    participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
    ownerId: string;
}

export const DefaultCall: Call = {
    participants: {},
    channelId: '',
    startTime: 0,
    screenOn: '',
    threadId: '',
    ownerId: '',
};

export type CurrentCall = Call & {
    connected: boolean;
    serverUrl: string;
    myUserId: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
    voiceOn: Dictionary<boolean>;
    micPermissionsErrorDismissed: boolean;
    reactionStream: ReactionStreamEmoji[];
}

export const DefaultCurrentCall: CurrentCall = {
    connected: false,
    serverUrl: '',
    myUserId: '',
    participants: {},
    channelId: '',
    startTime: 0,
    screenOn: '',
    threadId: '',
    ownerId: '',
    screenShareURL: '',
    speakerphoneOn: false,
    voiceOn: {},
    micPermissionsErrorDismissed: false,
    reactionStream: [],
};

export type CallParticipant = {
    id: string;
    muted: boolean;
    raisedHand: number;
    userModel?: UserModel;
    reaction?: CallReaction;
}

export type ChannelsWithCalls = Dictionary<boolean>;

export type ServerChannelState = {
    channel_id: string;
    enabled: boolean;
    call?: ServerCallState;
}

export type ServerUserState = {
    unmuted: boolean;
    raised_hand: number;
}

export type ServerCallState = {
    id: string;
    start_at: number;
    users: string[];
    states: ServerUserState[];
    thread_id: string;
    screen_sharing_id: string;
    owner_id: string;
}

export type CallsConnection = {
    disconnect: () => void;
    mute: () => void;
    unmute: () => void;
    waitForPeerConnection: () => Promise<void>;
    raiseHand: () => void;
    unraiseHand: () => void;
    initializeVoiceTrack: () => void;
}

export type ServerCallsConfig = {
    ICEServers?: string[]; // deprecated
    ICEServersConfigs?: ICEServersConfigs;
    AllowEnableCalls: boolean;
    DefaultEnabled: boolean;
    NeedsTURNCredentials: boolean;
    sku_short_name: string;
    MaxCallParticipants: number;
}

export type CallsConfig = ServerCallsConfig & {
    pluginEnabled: boolean;
    last_retrieved_at: number;
}

export const DefaultCallsConfig: CallsConfig = {
    pluginEnabled: false,
    ICEServers: [], // deprecated
    ICEServersConfigs: [],
    AllowEnableCalls: false,
    DefaultEnabled: false,
    NeedsTURNCredentials: false,
    last_retrieved_at: 0,
    sku_short_name: '',
    MaxCallParticipants: 0,
};

export type ICEServersConfigs = Array<ConfigurationParamWithUrls | ConfigurationParamWithUrl>;

export type ApiResp = {
    message?: string;
    detailed_error?: string;
    status_code: number;
}

export type CallReactionEmoji = {
    name: string;
    skin?: string;
    unified: string;
}

export type CallReaction = {
    user_id: string;
    emoji: CallReactionEmoji;
    timestamp: number;
}

export type ReactionStreamEmoji = {
    name: string;
    latestTimestamp: number;
    count: number;
};
