// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import {
    isRecordChannelMembershipEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformChannelMembershipRecord,
    transformPreferenceRecord,
    transformUserRecord,
} from '@database/operator/server_data_operator/transformers/user';

describe('*** Operator: User Handlers tests ***', () => {
    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com'].operator;
    });

    it('=> HandleReactions: should write to both Reactions and CustomEmoji tables', async () => {
        expect.assertions(2);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
        const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

        await operator.handleReactions({
            reactions: [
                {
                    create_at: 1608263728086,
                    emoji_name: 'p4p1',
                    post_id: '4r9jmr7eqt8dxq3f9woypzurry',
                    user_id: 'ooumoqgq3bfiijzwbn8badznwc',
                },
            ],
            prepareRecordsOnly: false,
        });

        // Called twice:  Once for Reaction record and once for CustomEmoji record
        expect(spyOnPrepareRecords).toHaveBeenCalledTimes(2);

        // Only one batch operation for both tables
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandleUsers: should write to the User table', async () => {
        expect.assertions(2);

        const users: UserProfile[] = [
            {
                id: '9ciscaqbrpd6d8s68k76xb9bte',
                create_at: 1599457495881,
                update_at: 1607683720173,
                delete_at: 0,
                username: 'a.l',
                auth_service: 'saml',
                email: 'a.l@mattermost.com',
                email_verified: true,
                is_bot: false,
                nickname: '',
                first_name: 'A',
                last_name: 'L',
                position: 'Mobile Engineer',
                roles: 'system_user',
                props: {},
                notify_props: {
                    desktop: 'all',
                    desktop_sound: 'true',
                    email: 'true',
                    first_name: 'true',
                    mark_unread: 'mention',
                    mention_keys: '',
                    push: 'mention',
                    channel: 'true',
                    auto_responder_active: 'false',
                    auto_responder_message: 'Hello, I am out of office and unable to respond to messages.',
                    comments: 'never',
                    desktop_notification_sound: 'Hello',
                    push_status: 'online',
                },
                last_picture_update: 1604686302260,
                locale: 'en',
                timezone: {
                    automaticTimezone: 'Indian/Mauritius',
                    manualTimezone: '',
                    useAutomaticTimezone: '',
                },
            },
        ];

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        await operator.handleUsers({users, prepareRecordsOnly: false});

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: users,
            tableName: 'User',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordUserEqualToRaw,
            transformer: transformUserRecord,
        });
    });

    it('=> HandlePreferences: should write to the PREFERENCE table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const preferences = [
            {
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                category: 'group_channel_show',
                name: 'qj91hepgjfn6xr4acm5xzd8zoc',
                value: 'true',
            },
            {
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                category: 'notifications',
                name: 'email_interval',
                value: '30',
            },
            {
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                category: 'theme',
                name: '',
                value:
                    '{"awayIndicator":"#c1b966","buttonBg":"#4cbba4","buttonColor":"#ffffff","centerChannelBg":"#2f3e4e","centerChannelColor":"#dddddd","codeTheme":"solarized-dark","dndIndicator":"#e81023","errorTextColor":"#ff6461","image":"/static/files/0b8d56c39baf992e5e4c58d74fde0fd6.png","linkColor":"#a4ffeb","mentionBg":"#b74a4a","mentionColor":"#ffffff","mentionHighlightBg":"#984063","mentionHighlightLink":"#a4ffeb","newMessageSeparator":"#5de5da","onlineIndicator":"#65dcc8","sidebarBg":"#1b2c3e","sidebarHeaderBg":"#1b2c3e","sidebarHeaderTextColor":"#ffffff","sidebarText":"#ffffff","sidebarTextActiveBorder":"#66b9a7","sidebarTextActiveColor":"#ffffff","sidebarTextHoverBg":"#4a5664","sidebarUnreadText":"#ffffff","type":"Mattermost Dark"}',
            },
            {
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                category: 'tutorial_step',
                name: '9ciscaqbrpd6d8s68k76xb9bte',
                value: '2',
            },
        ];

        await operator.handlePreferences({
            preferences,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            createOrUpdateRawValues: preferences,
            tableName: 'Preference',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordPreferenceEqualToRaw,
            transformer: transformPreferenceRecord,
        });
    });

    it('=> HandleChannelMembership: should write to the CHANNEL_MEMBERSHIP table', async () => {
        expect.assertions(2);
        const channelMemberships: ChannelMembership[] = [
            {
                channel_id: '17bfnb1uwb8epewp4q3x3rx9go',
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                roles: 'wqyby5r5pinxxdqhoaomtacdhc',
                last_viewed_at: 1613667352029,
                msg_count: 3864,
                mention_count: 0,
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    ignore_channel_mentions: 'default',
                    mark_unread: 'mention',
                    push: 'default',
                },
                last_update_at: 1613667352029,
                scheme_user: true,
                scheme_admin: false,
            },
            {
                channel_id: '1yw6gxfr4bn1jbyp9nr7d53yew',
                user_id: '9ciscaqbrpd6d8s68k76xb9bte',
                roles: 'channel_user',
                last_viewed_at: 1615300540549,
                msg_count: 16,
                mention_count: 0,
                notify_props: {
                    desktop: 'default',
                    email: 'default',
                    ignore_channel_mentions: 'default',
                    mark_unread: 'all',
                    push: 'default',
                },
                last_update_at: 1615300540549,
                scheme_user: true,
                scheme_admin: false,
            },
        ];

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        await operator.handleChannelMembership({
            channelMemberships,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'user_id',
            createOrUpdateRawValues: channelMemberships,
            tableName: 'ChannelMembership',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordChannelMembershipEqualToRaw,
            transformer: transformChannelMembershipRecord,
        });
    });
});
