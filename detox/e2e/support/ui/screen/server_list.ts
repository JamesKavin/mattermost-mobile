// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ServerListScreen {
    testID = {
        serverListScreen: 'server_list.screen',
        serverListBackdrop: 'server_list.backdrop',
        serverListTitle: 'server_list.title',
        addServerButton: 'server_list.add_a_server.button',
        tutorialHighlight: 'tutorial_highlight',
        tutorialSwipeLeft: 'tutorial_swipe_left',
    };

    serverListScreen = element(by.id(this.testID.serverListScreen));
    serverListBackdrop = element(by.id(this.testID.serverListBackdrop));
    serverListTitle = element(by.id(this.testID.serverListTitle));
    addServerButton = element(by.id(this.testID.addServerButton));
    tutorialHighlight = element(by.id(this.testID.tutorialHighlight));
    tutorialSwipeLeft = element(by.id(this.testID.tutorialSwipeLeft));

    toServerItemTestIdPrefix = (serverDisplayName: string) => {
        return `server_list.server_item.${serverDisplayName.replace(/ /g, '_').toLocaleLowerCase()}`;
    };

    getServerItemActive = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.active`));
    };

    getServerItemInactive = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.inactive`));
    };

    getServerItemServerIcon = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.server_icon`));
    };

    getServerItemEditOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.edit.option`));
    };

    getServerItemRemoveOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.remove.option`));
    };

    getServerItemLoginOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.login.option`));
    };

    getServerItemLogoutOption = (serverDisplayName: string) => {
        return element(by.id(`${this.toServerItemTestIdPrefix(serverDisplayName)}.logout.option`));
    };

    toBeVisible = async () => {
        await waitFor(this.serverListScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.serverListScreen;
    };

    open = async () => {
        // # Open server list screen
        await ChannelListScreen.serverIcon.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.serverListBackdrop.tap({x: 5, y: 10});
        await expect(this.serverListScreen).not.toBeVisible();
    };

    closeTutorial = async () => {
        await expect(this.tutorialHighlight).toExist();
        await this.tutorialSwipeLeft.tap();
        await expect(this.tutorialHighlight).not.toExist();
    };
}

const serverListScreen = new ServerListScreen();
export default serverListScreen;
