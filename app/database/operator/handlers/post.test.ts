// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import Operator from '@database/operator';
import {isRecordDraftEqualToRaw} from '@database/operator/comparators';
import {prepareDraftRecord} from '@database/operator/prepareRecords/post';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {DatabaseType} from '@typings/database/enums';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Operator: Post Handlers tests ***', () => {
    let databaseManagerClient: DatabaseManager;
    let operatorClient: Operator;

    beforeAll(async () => {
        databaseManagerClient = new DatabaseManager();
        const database = await databaseManagerClient.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'base_handler',
                dbType: DatabaseType.SERVER,
                serverUrl: 'baseHandler.test.com',
            },
        });

        operatorClient = new Operator(database!);
    });

    it('=> HandleDraft: should write to the Draft entity', async () => {
        expect.assertions(1);

        await createTestConnection({databaseName: 'post_handler', setActive: true});

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');
        const values = [
            {
                channel_id: '4r9jmr7eqt8dxq3f9woypzurrychannelid',
                files: [
                    {
                        id: '322dxx',
                        user_id: 'user_id',
                        post_id: 'post_id',
                        create_at: 123,
                        update_at: 456,
                        delete_at: 789,
                        name: 'an_image',
                        extension: 'jpg',
                        size: 10,
                        mime_type: 'image',
                        width: 10,
                        height: 10,
                        has_preview_image: false,
                        clientId: 'clientId',
                    },
                ],
                message: 'test draft message for post',
                root_id: '',
            },
        ];

        await operatorClient.handleDraft({drafts: values, prepareRecordsOnly: false});

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordDraftEqualToRaw,
            fieldName: 'channel_id',
            operator: prepareDraftRecord,
            rawValues: values,
            tableName: 'Draft',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandlePosts: should write to Post and its sub-child entities', async () => {
        expect.assertions(12);

        const posts = [
            {
                id: '8swgtrrdiff89jnsiwiip3y1eoe',
                create_at: 1596032651747,
                update_at: 1596032651747,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '',
                parent_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                original_id: '',
                message: "I'll second these kudos!  Thanks m!",
                type: '',
                props: {},
                hashtags: '',
                pending_post_id: '',
                reply_count: 4,
                last_reply_at: 0,
                participants: null,
                metadata: {
                    images: {
                        'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4': {
                            width: 400,
                            height: 400,
                            format: 'png',
                            frame_count: 0,
                        },
                    },
                    reactions: [
                        {
                            user_id: 'njic1w1k5inefp848jwk6oukio',
                            post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                            emoji_name: 'clap',
                            create_at: 1608252965442,
                            update_at: 1608252965442,
                            delete_at: 0,
                        },
                    ],
                    embeds: [
                        {
                            type: 'opengraph',
                            url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                            data: {
                                type: 'object',
                                url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                                title: 'mickmister/mattermost-plugin-default-theme',
                                description: 'Contribute to mickmister/mattermost-plugin-default-theme development by creating an account on GitHub.',
                                determiner: '',
                                site_name: 'GitHub',
                                locale: '',
                                locales_alternate: null,
                                images: [
                                    {
                                        url: '',
                                        secure_url: 'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4',
                                        type: '',
                                        width: 0,
                                        height: 0,
                                    },
                                ],
                                audios: null,
                                videos: null,
                            },
                        },
                    ],
                    emojis: [
                        {
                            id: 'dgwyadacdbbwjc8t357h6hwsrh',
                            create_at: 1502389307432,
                            update_at: 1502389307432,
                            delete_at: 0,
                            creator_id: 'x6sdh1ok1tyd9f4dgq4ybw839a',
                            name: 'thanks',
                        },
                    ],
                    files: [
                        {
                            id: 'f1oxe5rtepfs7n3zifb4sso7po',
                            user_id: '89ertha8xpfsumpucqppy5knao',
                            post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                            create_at: 1608270920357,
                            update_at: 1608270920357,
                            delete_at: 0,
                            name: '4qtwrg.jpg',
                            extension: 'jpg',
                            size: 89208,
                            mime_type: 'image/jpeg',
                            width: 500,
                            height: 656,
                            has_preview_image: true,
                            mini_preview:
                                '/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AN/T/iZp+pX15FpUmnwLbXtpJpyy2sQLw8CcBXA+bksCDnHGOaf4W+P3xIshbQ6loB8RrbK11f3FpbBFW3ZwiFGHB2kr25BIOeCPPbX4S3407T7rTdDfxFNIpDyRaw9lsB4OECHGR15yO4GK6fRPhR4sGmSnxAs8NgchNOjvDPsjz8qSHA37cDk5JPPFdlOpTdPlcVt/Ku1lrvr17b67EPnjrH8/626H/9k=',
                        },
                    ],
                },
            },
            {
                id: '8fcnk3p1jt8mmkaprgajoxz115a',
                create_at: 1596104683748,
                update_at: 1596104683748,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                user_id: 'hy5sq51sebfh58ktrce5ijtcwyy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                parent_id: '',
                original_id: '',
                message: 'a added to the channel by j.',
                type: 'system_add_to_channel',
                props: {
                    addedUserId: 'z89qsntet7bimd3xddfu7u9ncdaxc',
                    addedUsername: 'a',
                    userId: 'hy5sdfdfq51sebfh58ktrce5ijtcwy',
                    username: 'j',
                },
                hashtags: '',
                pending_post_id: '',
                reply_count: 0,
                last_reply_at: 0,
                participants: null,
                metadata: {},
            },
            {
                id: '3y3w3a6gkbg73bnj3xund9o5ic',
                create_at: 1596277483749,
                update_at: 1596277483749,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                user_id: '44ud4m9tqwby3mphzzdwm7h31sr',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                parent_id: 'ps81iqbwesfby8jayz7owg4yypo',
                original_id: '',
                message: 'Great work M!',
                type: '',
                props: {},
                hashtags: '',
                pending_post_id: '',
                reply_count: 4,
                last_reply_at: 0,
                participants: null,
                metadata: {},
            },
        ];

        const spyOnHandleFiles = jest.spyOn(operatorClient as any, 'handleFiles');
        const spyOnHandlePostMetadata = jest.spyOn(operatorClient as any, 'handlePostMetadata');
        const spyOnHandleReactions = jest.spyOn(operatorClient as any, 'handleReactions');
        const spyOnHandleCustomEmojis = jest.spyOn(operatorClient as any, 'handleIsolatedEntity');
        const spyOnHandlePostsInThread = jest.spyOn(operatorClient as any, 'handlePostsInThread');
        const spyOnHandlePostsInChannel = jest.spyOn(operatorClient as any, 'handlePostsInChannel');

        await createTestConnection({databaseName: 'post_handler', setActive: true});

        // handlePosts will in turn call handlePostsInThread
        await operatorClient.handlePosts({
            orders: [
                '8swgtrrdiff89jnsiwiip3y1eoe',
                '8fcnk3p1jt8mmkaprgajoxz115a',
                '3y3w3a6gkbg73bnj3xund9o5ic',
            ],
            values: posts,
            previousPostId: '',
        });

        expect(spyOnHandleReactions).toHaveBeenCalledTimes(1);
        expect(spyOnHandleReactions).toHaveBeenCalledWith({
            reactions: [
                {
                    user_id: 'njic1w1k5inefp848jwk6oukio',
                    post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                    emoji_name: 'clap',
                    create_at: 1608252965442,
                    update_at: 1608252965442,
                    delete_at: 0,
                },
            ],
            prepareRecordsOnly: true,
        });

        expect(spyOnHandleFiles).toHaveBeenCalledTimes(1);
        expect(spyOnHandleFiles).toHaveBeenCalledWith({
            files: [
                {
                    id: 'f1oxe5rtepfs7n3zifb4sso7po',
                    user_id: '89ertha8xpfsumpucqppy5knao',
                    post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                    create_at: 1608270920357,
                    update_at: 1608270920357,
                    delete_at: 0,
                    name: '4qtwrg.jpg',
                    extension: 'jpg',
                    size: 89208,
                    mime_type: 'image/jpeg',
                    width: 500,
                    height: 656,
                    has_preview_image: true,
                    mini_preview:
                        '/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AN/T/iZp+pX15FpUmnwLbXtpJpyy2sQLw8CcBXA+bksCDnHGOaf4W+P3xIshbQ6loB8RrbK11f3FpbBFW3ZwiFGHB2kr25BIOeCPPbX4S3407T7rTdDfxFNIpDyRaw9lsB4OECHGR15yO4GK6fRPhR4sGmSnxAs8NgchNOjvDPsjz8qSHA37cDk5JPPFdlOpTdPlcVt/Ku1lrvr17b67EPnjrH8/626H/9k=',
                },
            ],
            prepareRecordsOnly: true,
        });

        expect(spyOnHandlePostMetadata).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostMetadata).toHaveBeenCalledWith({
            embeds: [
                {
                    embed: [
                        {
                            type: 'opengraph',
                            url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                            data: {
                                type: 'object',
                                url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                                title: 'mickmister/mattermost-plugin-default-theme',
                                description: 'Contribute to mickmister/mattermost-plugin-default-theme development by creating an account on GitHub.',
                                determiner: '',
                                site_name: 'GitHub',
                                locale: '',
                                locales_alternate: null,
                                images: [
                                    {
                                        url: '',
                                        secure_url: 'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4',
                                        type: '',
                                        width: 0,
                                        height: 0,
                                    },
                                ],
                                audios: null,
                                videos: null,
                            },
                        },
                    ],
                    postId: '8swgtrrdiff89jnsiwiip3y1eoe',
                },
            ],
            images: [
                {
                    images: {
                        'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4': {
                            width: 400,
                            height: 400,
                            format: 'png',
                            frame_count: 0,
                        },
                    },
                    postId: '8swgtrrdiff89jnsiwiip3y1eoe',
                },
            ],
            prepareRecordsOnly: true,
        });

        expect(spyOnHandleCustomEmojis).toHaveBeenCalledTimes(1);
        expect(spyOnHandleCustomEmojis).toHaveBeenCalledWith({
            tableName: 'CustomEmoji',
            prepareRecordsOnly: false,
            values: [
                {
                    id: 'dgwyadacdbbwjc8t357h6hwsrh',
                    create_at: 1502389307432,
                    update_at: 1502389307432,
                    delete_at: 0,
                    creator_id: 'x6sdh1ok1tyd9f4dgq4ybw839a',
                    name: 'thanks',
                },
            ],
        });

        expect(spyOnHandlePostsInThread).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInThread).toHaveBeenCalledWith([
            {earliest: 1596032651747, post_id: '8swgtrrdiff89jnsiwiip3y1eoe'},
        ]);

        expect(spyOnHandlePostsInChannel).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInChannel).toHaveBeenCalledWith(posts.slice(0, 3));
    });
});
