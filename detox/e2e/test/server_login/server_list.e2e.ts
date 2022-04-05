// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    User,
    Setup,
} from '@support/server_api';
import {
    serverOneUrl,
    serverTwoUrl,
    serverThreeUrl,
    siteOneUrl,
    siteTwoUrl,
    siteThreeUrl,
} from '@support/test_config';
import {
    Alert,
} from '@support/ui/component';
import {
    ChannelListScreen,
    EditServerScreen,
    HomeScreen,
    LoginScreen,
    ServerScreen,
    ServerListScreen,
} from '@support/ui/screen';
import {expect} from 'detox';

describe('Server Login - Server List', () => {
    const serverOneDisplayName = 'Server 1';
    const serverTwoDisplayName = 'Server 2';
    const serverThreeDisplayName = 'Server 3';
    let serverOneUser: any;
    let serverTwoUser: any;
    let serverThreeUser: any;

    beforeAll(async () => {
        // # Log in to the first server
        ({user: serverOneUser} = await Setup.apiInit(siteOneUrl));
        await expect(ServerScreen.headerTitleConnectToServer).toBeVisible();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);
    });

    beforeEach(async () => {
        // * Verify on channel list screen
        await ChannelListScreen.toBeVisible();
    });

    afterAll(async () => {
        // # Log out
        await HomeScreen.logout();
    });

    it('MM-T4691_1 - should match elements on server list screen', async () => {
        // # Open server list screen
        await ServerListScreen.open();

        // * Verify basic elements on server list screen
        await expect(ServerListScreen.serverListTitle).toHaveText('Your servers');
        await expect(ServerListScreen.getServerItemActive(serverOneDisplayName)).toBeVisible();
        await expect(ServerListScreen.addServerButton).toBeVisible();

        // # Go back to channel list screen
        await ServerListScreen.getServerItemActive(serverOneDisplayName).tap();
    });

    it('MM-T4691_2 - should be able to add and log in to new servers', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify first server is active
        await expect(ServerListScreen.getServerItemActive(serverOneDisplayName)).toBeVisible();

        // # Add a second server and log in to the second server
        await User.apiAdminLogin(siteTwoUrl);
        ({user: serverTwoUser} = await Setup.apiInit(siteTwoUrl));
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverTwoUrl, serverTwoDisplayName);
        await LoginScreen.login(serverTwoUser);

        // * Verify on channel list screen of the second server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverTwoDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify second server is active and first server is inactive
        await expect(ServerListScreen.getServerItemActive(serverTwoDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverOneDisplayName)).toBeVisible();

        // # Add a third server and log in to the third server
        await User.apiAdminLogin(siteThreeUrl);
        ({user: serverThreeUser} = await Setup.apiInit(siteThreeUrl));
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverThreeUrl, serverThreeDisplayName);
        await LoginScreen.login(serverThreeUser);

        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Open server list screen
        await ServerListScreen.open();

        // * Verify third server is active, and first and second servers are inactive
        await expect(ServerListScreen.getServerItemActive(serverThreeDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverOneDisplayName)).toBeVisible();
        await expect(ServerListScreen.getServerItemInactive(serverTwoDisplayName)).toBeVisible();

        // # Go back to first server
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).tap();
    });

    it('MM-T4691_3 - should be able to switch to another existing server', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen and tap on third server
        await ServerListScreen.open();
        await ServerListScreen.getServerItemInactive(serverThreeDisplayName).tap();

        // * Verify on channel list screen of the third server
        await ChannelListScreen.toBeVisible();
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverThreeDisplayName);

        // # Open server list screen and go back to first server
        await ServerListScreen.open();
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).tap();
    });

    it('MM-T4691_4 - should be able to edit server display name of active and inactive servers', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, swipe left on first server and tap on edit option
        await ServerListScreen.open();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).swipe('left');
        await ServerListScreen.getServerItemEditOption(serverOneDisplayName).tap();

        // * Verify on edit server screen
        await EditServerScreen.toBeVisible();

        // # Enter the same first server display name
        await EditServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);

        // * Verify save button is disabled
        await expect(EditServerScreen.saveButtonDisabled).toBeVisible();

        // # Enter a new first server display name
        const newServerOneDisplayName = `${serverOneDisplayName} new`;
        await EditServerScreen.serverDisplayNameInput.replaceText(newServerOneDisplayName);

        // * Verify save button is enabled
        await expect(EditServerScreen.saveButton).toBeVisible();

        // # Tap on save button
        await EditServerScreen.saveButton.tap();

        // * Verify the new first server display name
        await expect(ServerListScreen.getServerItemActive(newServerOneDisplayName)).toBeVisible();

        // # Revert back to original first server display name and go back to first server
        await ServerListScreen.getServerItemActive(newServerOneDisplayName).swipe('left');
        await ServerListScreen.getServerItemEditOption(newServerOneDisplayName).tap();
        await EditServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        await EditServerScreen.saveButton.tap();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).tap();
    });

    it('MM-T4691_5 - should be able to remove a server from the list', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, swipe left on first server and tap on remove option
        await ServerListScreen.open();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).swipe('left');
        await ServerListScreen.getServerItemRemoveOption(serverOneDisplayName).tap();

        // * Verify remove server alert is displayed
        await expect(Alert.removeServerTitle(serverOneDisplayName)).toBeVisible();

        // # Tap on remove button and go back to server list screen
        await Alert.removeButton.tap();
        await ServerListScreen.open();

        // * Verify first server is removed
        await expect(ServerListScreen.getServerItemActive(serverOneDisplayName)).not.toExist();
        await expect(ServerListScreen.getServerItemInactive(serverOneDisplayName)).not.toExist();

        // # Add first server back to the list and log in to the first server
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);
    });

    it('MM-T4691_6 - should be able to log out a server from the list', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, swipe left on first server and tap on logout option
        await ServerListScreen.open();
        await ServerListScreen.getServerItemActive(serverOneDisplayName).swipe('left');
        await ServerListScreen.getServerItemLogoutOption(serverOneDisplayName).tap();

        // * Verify logout server alert is displayed
        await expect(Alert.logoutTitle(serverOneDisplayName)).toBeVisible();

        // # Tap on logout button and go back to server list screen
        await Alert.logoutButton.tap();
        await ServerListScreen.open();

        // * Verify first server is logged out
        await ServerListScreen.getServerItemInactive(serverOneDisplayName).swipe('left');
        await expect(ServerListScreen.getServerItemLoginOption(serverOneDisplayName)).toBeVisible();

        // # Log back in to first server
        await ServerListScreen.getServerItemLoginOption(serverOneDisplayName).tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(serverOneUser);
    });

    it('MM-T4691_7 - should not be able to add server for an already existing server', async () => {
        // * Verify on channel list screen of the first server
        await expect(ChannelListScreen.headerServerDisplayName).toHaveText(serverOneDisplayName);

        // # Open server list screen, attempt to add a server already logged in and with inactive session
        await ServerListScreen.open();
        await ServerListScreen.addServerButton.tap();
        await expect(ServerScreen.headerTitleAddServer).toBeVisible();
        await ServerScreen.serverUrlInput.replaceText(serverTwoUrl);
        await ServerScreen.serverDisplayNameInput.replaceText(serverTwoDisplayName);
        await ServerScreen.connectButton.tap();

        // * Verify same name server error
        const sameNameServerError = 'You are using this name for another server.';
        await expect(ServerScreen.serverDisplayNameInputError).toHaveText(sameNameServerError);

        // # Attempt to add a server already logged in and with active session, with the same server display name
        await ServerScreen.serverUrlInput.replaceText(serverOneUrl);
        await ServerScreen.serverDisplayNameInput.replaceText(serverOneDisplayName);
        await ServerScreen.connectButton.tap();

        // * Verify same name server error
        await expect(ServerScreen.serverDisplayNameInputError).toHaveText(sameNameServerError);

        // # Close server screen to go back to first server
        await ServerScreen.close();
    });
});
