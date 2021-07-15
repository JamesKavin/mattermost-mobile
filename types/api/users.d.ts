// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type UserNotifyProps = {
    auto_responder_active?: 'true' | 'false';
    auto_responder_message?: string;
    desktop: 'default' | 'all' | 'mention' | 'none';
    desktop_notification_sound?: string;
    desktop_sound: 'true' | 'false';
    email: 'true' | 'false';
    mark_unread: 'all' | 'mention';
    push: 'default' | 'all' | 'mention' | 'none';
    push_status: 'ooo' | 'offline' | 'away' | 'dnd' | 'online';
    comments: 'never' | 'root' | 'any';
    first_name: 'true' | 'false';
    channel: 'true' | 'false';
    mention_keys: string;
    user_id?: string;
};

type UserProfile = {
    id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    username: string;
    auth_data?: string;
    auth_service: string;
    email: string;
    email_verified?: boolean;
    nickname: string;
    first_name: string;
    last_name: string;
    position: string;
    roles: string;
    locale: string;
    notify_props: UserNotifyProps;
    props?: UserProps;
    terms_of_service_id?: string;
    terms_of_service_create_at?: number;
    timezone?: UserTimezone;
    is_bot: boolean;
    last_picture_update: number;
};

type UsersState = {
    currentUserId: string;
    isManualStatus: RelationOneToOne<UserProfile, boolean>;
    mySessions: any[];
    profiles: IDMappedObjects<UserProfile>;
    profilesInTeam: RelationOneToMany<Team, UserProfile>;
    profilesNotInTeam: RelationOneToMany<Team, UserProfile>;
    profilesWithoutTeam: Set<string>;
    profilesInChannel: RelationOneToMany<Channel, UserProfile>;
    profilesNotInChannel: RelationOneToMany<Channel, UserProfile>;
    statuses: RelationOneToOne<UserProfile, string>;
    stats: any;
};

type UserTimezone = {
    useAutomaticTimezone: boolean | string;
    automaticTimezone: string;
    manualTimezone: string;
};

type UserActivity = {
    [x in PostType]: {
        [y in $ID<UserProfile>]: | {
            ids: Array<$ID<UserProfile>>;
            usernames: Array<UserProfile['username']>;
        } | Array<$ID<UserProfile>>;
    };
};

type UserStatus = {
	user_id: string;
	status: string;
	manual: boolean;
	last_activity_at: number;
	active_channel?: string;
};

type UserProps = {
    [userPropsName: string]: any;
};
