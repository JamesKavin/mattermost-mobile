// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {Setup} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
} from '@support/test_config';
import {
    BrowseChannelsScreen,
    ChannelScreen,
    ChannelListScreen,
    CreateDirectMessageScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Channels - Channel List', () => {
    const serverOneDisplayName = 'Server 1';
    const channelsCategory = 'channels';
    const directMessagesCategory = 'direct_messages';
    const offTopicChannelName = 'off-topic';
    const townSquareChannelName = 'town-square';
    let testChannel: any;
    let testTeam: any;

    beforeAll(async () => {
        const {channel, team, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testTeam = team;

        // # Log in to server
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(user);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4728_1 - should match elements on channel list screen', async () => {
        // * Verify basic elements on channel list screen
        await expect(ChannelListScreen.serverIcon).toBeVisible();
        await expect(ChannelListScreen.headerTeamDisplayName).toHaveText(testTeam.display_name);
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);
        await expect(ChannelListScreen.headerChevronButton).toBeVisible();
        await expect(ChannelListScreen.headerPlusButton).toBeVisible();
        await expect(ChannelListScreen.threadsButton).toBeVisible();
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(channelsCategory)).toHaveText('CHANNELS');
        await expect(ChannelListScreen.getChannelListItemDisplayName(channelsCategory, testChannel.name)).toHaveText(testChannel.display_name);
        await expect(ChannelListScreen.getChannelListItemDisplayName(channelsCategory, offTopicChannelName)).toHaveText('Off-Topic');
        await expect(ChannelListScreen.getChannelListItemDisplayName(channelsCategory, townSquareChannelName)).toHaveText('Town Square');
        await expect(ChannelListScreen.getCategoryHeaderDisplayName(directMessagesCategory)).toHaveText('DIRECT MESSAGES');
    });

    it('MM-T4728_2 - should be able to switch between channels', async () => {
        // # Tap on a first channel
        await ChannelListScreen.getChannelListItemDisplayName(channelsCategory, testChannel.name).tap();

        // * Verify on first channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText(testChannel.display_name);
        await expect(ChannelScreen.introDisplayName).toHaveText(testChannel.display_name);

        // # Go back to channel list screen and tap on a second channel
        await ChannelScreen.backButton.tap();
        await ChannelListScreen.toBeVisible();
        await ChannelListScreen.getChannelListItemDisplayName(channelsCategory, offTopicChannelName).tap();

        // * Verify on second channel
        await ChannelScreen.toBeVisible();
        await expect(ChannelScreen.headerTitle).toHaveText('Off-Topic');
        await expect(ChannelScreen.introDisplayName).toHaveText('Off-Topic');

        // # Go back to channel list screen
        await ChannelScreen.back();
    });

    it('MM-T4728_3 - should be able to collapse and expand categories', async () => {
        // # Go to a channel to make it active and go back to channel list screen
        await ChannelListScreen.getChannelListItemDisplayName(channelsCategory, testChannel.name).tap();
        await ChannelScreen.toBeVisible();
        await ChannelScreen.backButton.tap();

        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();

        // # Toggle channels category to collapse
        await ChannelListScreen.getCategoryExpanded(channelsCategory).tap();

        // * Verify category is collapsed and only currently active channel is listed
        await expect(ChannelListScreen.getCategoryCollapsed(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemExpanded(channelsCategory, testChannel.name)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemCollapsed(channelsCategory, offTopicChannelName)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemCollapsed(channelsCategory, townSquareChannelName)).toBeVisible();

        // # Toggle channels category to expand
        await ChannelListScreen.getCategoryCollapsed(channelsCategory).tap();

        // * Verify category is expanded and all channels are listed
        await expect(ChannelListScreen.getCategoryExpanded(channelsCategory)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemExpanded(channelsCategory, testChannel.name)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemExpanded(channelsCategory, offTopicChannelName)).toBeVisible();
        await expect(ChannelListScreen.getChannelListItemExpanded(channelsCategory, townSquareChannelName)).toBeVisible();
    });

    it('MM-T4728_4 - should be able to go to browse channels screen', async () => {
        // # Tap on plus menu button and tap on browse channels item
        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.browseChannelsItem.tap();

        // * Verify on browse channels screen
        await BrowseChannelsScreen.toBeVisible();

        // # Go back to channel list screen
        await BrowseChannelsScreen.close();
    });

    it('MM-T4728_5 - should be able to go to create direct message screen', async () => {
        // # Tap on plus menu button and tap on open a direct message item
        await ChannelListScreen.headerPlusButton.tap();
        await ChannelListScreen.openDirectMessageItem.tap();

        // * Verify on create direct message screen
        await CreateDirectMessageScreen.toBeVisible();

        // # Go back to channel list screen
        await CreateDirectMessageScreen.close();
    });

    xit('MM-T4728_6 - should be able to go to create channel screen', async () => {
        // NOT YET IMPLEMENTED
    });

    xit('MM-T4728_7 - should be able to go to threads screen', async () => {
        // NOT YET IMPLEMENTED
    });

    xit('MM-T4728_8 - should be able to find channels', async () => {
        // NOT YET IMPLEMENTED
    });
});
