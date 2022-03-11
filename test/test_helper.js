// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import {random} from 'lodash';
import nock from 'nock';

import Config from '@assets/config.json';
import {Client} from '@client/rest';
import DatabaseManager from '@database/manager';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {generateId} from '@utils/general';

const PASSWORD = 'password1';
const DEFAULT_LOCALE = 'en';

class TestHelper {
    constructor() {
        this.basicClient = null;
        this.basicClient4 = null;

        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicCategory = null;
        this.basicCategoryChannel = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicMyChannel = null;
        this.basicMyChannelSettings = null;
        this.basicPost = null;
        this.basicRoles = null;
        this.basicScheme = null;
    }

    setupServerDatabase = async () => {
        const serverUrl = 'https://appv1.mattermost.com';
        await DatabaseManager.init([serverUrl]);
        const {database, operator} = DatabaseManager.serverDatabases[serverUrl];

        this.initMockEntities();

        // Add current user
        await operator.handleUsers({
            users: [this.basicUser],
            prepareRecordsOnly: false,
        });

        // Add one team
        await operator.handleTeam({
            teams: [this.basicTeam],
            prepareRecordsOnly: false,
        });
        await operator.handleMyTeam({
            myTeams: [this.basicTeamMember],
            prepareRecordsOnly: false,
        });

        // Add a category and associated channel entities
        await operator.handleCategories({
            categories: [this.basicCategory],
            prepareRecordsOnly: false,
        });
        await operator.handleCategoryChannels({
            categoryChannels: [this.basicCategoryChannel],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({
            channels: [this.basicChannel],
            prepareRecordsOnly: false,
        });
        await operator.handleMyChannel({
            prepareRecordsOnly: false,
            channels: [this.basicChannel],
            myChannels: [this.basicMyChannel],
        });
        await operator.handleMyChannelSettings({
            prepareRecordsOnly: false,
            settings: [this.basicMyChannelSettings],
        });

        const systems = await prepareCommonSystemValues(operator, {
            config: {},
            license: {},
            currentChannelId: '',
            currentTeamId: this.basicTeam.id,
            currentUserId: this.basicUser.id,
        });
        await operator.batchRecords(systems);

        return {database, operator};
    };

    activateMocking() {
        if (!nock.isActive()) {
            nock.activate();
        }
    }

    assertStatusOkay = (data) => {
        assert(data);
        assert(data.status === 'OK');
    };

    generateId = () => {
        return generateId();
    };

    createClient = () => {
        const mockApiClient = {
            baseUrl: 'https://community.mattermost.com',
            delete: jest.fn(),
            head: jest.fn(),
            get: jest.fn(),
            patch: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            upload: jest.fn(),
        };

        return new Client(mockApiClient, mockApiClient.baseUrl);
    };

    fakeCategory = (teamId) => {
        return {
            display_name: 'Test Category',
            type: 'custom',
            sort_order: 0,
            sorting: 'manual',
            muted: false,
            collapsed: false,
            team_id: teamId,
        };
    };

    fakeCategoryWithId = (teamId) => {
        return {
            ...this.fakeCategory(teamId),
            id: this.generateId(),
        };
    };

    fakeCategoryChannel = (categoryId, channelId) => {
        return {
            category_id: categoryId,
            channel_id: channelId,
            sort_order: random(0, 10, false),
        };
    };

    fakeCategoryChannelWithId = (teamId, categoryId, channelId) => {
        return {
            id: teamId + channelId,
            category_id: categoryId,
            channel_id: channelId,
            sort_order: random(0, 10, false),
        };
    };

    fakeChannel = (teamId) => {
        const name = this.generateId();

        return {
            name,
            team_id: teamId,

            // @to-do: Make tests more detriministic;
            // https://jestjs.io/docs/snapshot-testing#2-tests-should-be-deterministic
            // display_name: `Unit Test ${name}`,
            display_name: 'Channel',
            type: 'O',
            delete_at: 0,
            total_msg_count: 0,
            scheme_id: this.generateId(),
        };
    };

    fakeChannelWithId = (teamId) => {
        return {
            ...this.fakeChannel(teamId),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeDmChannel = (userId, otherUserId) => {
        return {
            name: userId > otherUserId ? otherUserId + '__' + userId : userId + '__' + otherUserId,
            team_id: '',
            display_name: `${otherUserId}`,
            type: 'D',
            status: 'offline',
            teammate_id: `${otherUserId}`,
            id: this.generateId(),
            delete_at: 0,
        };
    };

    fakeChannelMember = (userId, channelId) => {
        return {
            id: channelId,
            user_id: userId,
            channel_id: channelId,
            notify_props: {},
            roles: 'system_user',
            msg_count: 0,
            mention_count: 0,
            scheme_user: false,
            scheme_admin: false,
        };
    };

    fakeMyChannel = (channelId) => {
        return {
            id: channelId,
            channel_id: channelId,
            last_post_at: 0,
            last_viewed_at: 0,
            manually_unread: false,
            mentions_count: 0,
            message_count: 0,
            is_unread: false,
            roles: '',
            viewed_at: 0,
        };
    };

    fakeMyChannelSettings = (channelId) => {
        return {
            id: channelId,
            channel_id: channelId,
            notify_props: JSON.stringify({
                desktop: 'default',
                email: 'default',
                mark_unread: 'all',
                push: 'default',
                ignore_channel_mentions: 'default',
            }),
        };
    };

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    };

    fakePost = (channelId) => {
        const time = Date.now();

        return {
            id: this.generateId(),
            channel_id: channelId,
            create_at: time,
            update_at: time,
            message: `Unit Test ${this.generateId()}`,
            type: '',
        };
    };

    fakePostWithId = (channelId) => {
        return {
            ...this.fakePost(channelId),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeTeam = () => {
        const name = this.generateId();
        let inviteId = this.generateId();
        if (inviteId.length > 32) {
            inviteId = inviteId.substring(0, 32);
        }

        return {
            name,
            display_name: `Unit Test ${name}`,
            type: 'O',
            email: this.fakeEmail(),
            allowed_domains: '',
            invite_id: inviteId,
            scheme_id: this.generateId(),
        };
    };

    fakeTeamWithId = () => {
        return {
            ...this.fakeTeam(),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeTeamMember = (userId, teamId) => {
        return {
            id: teamId,
            user_id: userId,
            team_id: teamId,
            roles: 'team_user',
            delete_at: 0,
            scheme_user: false,
            scheme_admin: false,
        };
    };

    fakeUser = () => {
        return {
            email: this.fakeEmail(),
            allow_marketing: true,
            password: PASSWORD,
            locale: DEFAULT_LOCALE,
            username: this.generateId(),
            first_name: this.generateId(),
            last_name: this.generateId(),
            create_at: Date.now(),
            delete_at: 0,
            roles: 'system_user',
        };
    };

    fakeUserWithId = (id = this.generateId()) => {
        return {
            ...this.fakeUser(),
            id,
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeOutgoingHook = (teamId) => {
        return {
            team_id: teamId,
        };
    };

    fakeOutgoingHookWithId = (teamId) => {
        return {
            ...this.fakeOutgoingHook(teamId),
            id: this.generateId(),
        };
    };

    fakeFiles = (count) => {
        const files = [];
        while (files.length < count) {
            files.push({
                id: this.generateId(),
            });
        }

        return files;
    };

    fakeOAuthApp = () => {
        return {
            name: this.generateId(),
            callback_urls: ['http://localhost/notrealurl'],
            homepage: 'http://localhost/notrealurl',
            description: 'fake app',
            is_trusted: false,
            icon_url: 'http://localhost/notrealurl',
            update_at: 1507841118796,
        };
    };

    fakeOAuthAppWithId = () => {
        return {
            ...this.fakeOAuthApp(),
            id: this.generateId(),
        };
    };

    fakeBot = () => {
        return {
            user_id: this.generateId(),
            username: this.generateId(),
            display_name: 'Fake bot',
            owner_id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    mockLogin = () => {
        nock(this.basicClient4.getBaseRoute()).
            post('/users/login').
            reply(200, this.basicUser, {'X-Version-Id': 'Server Version'});

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams/members').
            reply(200, [this.basicTeamMember]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams/unread').
            reply(200, [{team_id: this.basicTeam.id, msg_count: 0, mention_count: 0}]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/teams').
            reply(200, [this.basicTeam]);

        nock(this.basicClient4.getBaseRoute()).
            get('/users/me/preferences').
            reply(200, [{user_id: this.basicUser.id, category: 'tutorial_step', name: this.basicUser.id, value: '999'}]);
    };

    initMockEntities = () => {
        this.basicUser = this.fakeUserWithId();
        this.basicUser.roles = 'system_user system_admin';
        this.basicTeam = this.fakeTeamWithId();
        this.basicTeamMember = this.fakeTeamMember(this.basicUser.id, this.basicTeam.id);
        this.basicCategory = this.fakeCategoryWithId(this.basicTeam.id);
        this.basicChannel = this.fakeChannelWithId(this.basicTeam.id);
        this.basicCategoryChannel = this.fakeCategoryChannelWithId(this.basicTeam.id, this.basicCategory.id, this.basicChannel.id);
        this.basicChannelMember = this.fakeChannelMember(this.basicUser.id, this.basicChannel.id);
        this.basicMyChannel = this.fakeMyChannel(this.basicChannel.id);
        this.basicMyChannelSettings = this.fakeMyChannelSettings(this.basicChannel.id);
        this.basicPost = {...this.fakePostWithId(this.basicChannel.id), create_at: 1507841118796};
        this.basicRoles = {
            system_admin: {
                id: this.generateId(),
                name: 'system_admin',
                display_name: 'authentication.roles.global_admin.name',
                description: 'authentication.roles.global_admin.description',
                permissions: [
                    'system_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            system_user: {
                id: this.generateId(),
                name: 'system_user',
                display_name: 'authentication.roles.global_user.name',
                description: 'authentication.roles.global_user.description',
                permissions: [
                    'system_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            team_admin: {
                id: this.generateId(),
                name: 'team_admin',
                display_name: 'authentication.roles.team_admin.name',
                description: 'authentication.roles.team_admin.description',
                permissions: [
                    'team_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            team_user: {
                id: this.generateId(),
                name: 'team_user',
                display_name: 'authentication.roles.team_user.name',
                description: 'authentication.roles.team_user.description',
                permissions: [
                    'team_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            channel_admin: {
                id: this.generateId(),
                name: 'channel_admin',
                display_name: 'authentication.roles.channel_admin.name',
                description: 'authentication.roles.channel_admin.description',
                permissions: [
                    'channel_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            channel_user: {
                id: this.generateId(),
                name: 'channel_user',
                display_name: 'authentication.roles.channel_user.name',
                description: 'authentication.roles.channel_user.description',
                permissions: [
                    'channel_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
        };
        this.basicScheme = this.mockSchemeWithId();
    };

    initBasic = async (client = this.createClient()) => {
        client.setUrl(Config.TestServerUrl || Config.DefaultServerUrl);
        this.basicClient = client;
        this.basicClient4 = client;

        this.initMockEntities();
        this.activateMocking();

        return {
            client: this.basicClient,
            client4: this.basicClient4,
            user: this.basicUser,
            team: this.basicTeam,
            channel: this.basicChannel,
            post: this.basicPost,
        };
    };

    mockScheme = () => {
        return {
            name: this.generateId(),
            description: this.generateId(),
            scope: 'channel',
            defaultchanneladminrole: false,
            defaultchanneluserrole: false,
        };
    };

    mockSchemeWithId = () => {
        return {
            ...this.mockScheme(),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    testIncomingHook = () => {
        return {
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
            user_id: this.basicUser.id,
            channel_id: this.basicChannel.id,
            team_id: this.basicTeam.id,
            display_name: 'test',
            description: 'test',
        };
    };

    testOutgoingHook = () => {
        return {
            id: this.generateId(),
            token: this.generateId(),
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser.id,
            channel_id: this.basicChannel.id,
            team_id: this.basicTeam.id,
            trigger_words: ['testword'],
            trigger_when: 0,
            callback_urls: ['http://localhost/notarealendpoint'],
            display_name: 'test',
            description: '',
            content_type: 'application/x-www-form-urlencoded',
        };
    };

    testCommand = (teamId) => {
        return {
            trigger: this.generateId(),
            method: 'P',
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser.id,
            team_id: teamId,
            username: 'test',
            icon_url: 'http://localhost/notarealendpoint',
            auto_complete: true,
            auto_complete_desc: 'test',
            auto_complete_hint: 'test',
            display_name: 'test',
            description: 'test',
            url: 'http://localhost/notarealendpoint',
        };
    };

    tearDown = async () => {
        nock.restore();

        this.basicClient = null;
        this.basicClient4 = null;
        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicPost = null;
    };

    wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
}

export default new TestHelper();
