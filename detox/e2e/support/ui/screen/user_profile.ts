// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ProfilePicture} from '@support/ui/component';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class UserProfileScreen {
    testID = {
        userProfileScreen: 'user_profile.screen',
        userProfileAvatarPrefix: 'user_profile_avatar.',
        userProfileBackdrop: 'user_profile.backdrop',
        systemAdminTag: 'user_profile.system_admin.tag',
        teamAdminTag: 'user_profile.team_admin.tag',
        channelAdminTag: 'user_profile.channel_admin.tag',
        userDisplayName: 'user_profile.display_name',
        username: 'user_profile.username',
        sendMessageProfileOption: 'user_profile_options.send_message.option',
        mentionProfileOption: 'user_profile_options.mention.option',
        userNicknameTitle: 'user_profile.nickname.title',
        userNicknameDescription: 'user_profile.nickname.description',
        userPositionTitle: 'user_profile.position.title',
        userPositionDescription: 'user_profile.position.description',
        userLocalTimeTitle: 'user_profile.local_time.title',
        userLocalTimeDescription: 'user_profile.local_time.description',
    };

    userProfileScreen = element(by.id(this.testID.userProfileScreen));
    userProfileBackdrop = element(by.id(this.testID.userProfileBackdrop));
    userDisplayName = element(by.id(this.testID.userDisplayName));
    username = element(by.id(this.testID.username));
    sendMessageProfileOption = element(by.id(this.testID.sendMessageProfileOption));
    mentionProfileOption = element(by.id(this.testID.mentionProfileOption));
    userNicknameTitle = element(by.id(this.testID.userNicknameTitle));
    userNicknameDescription = element(by.id(this.testID.userNicknameDescription));
    userPositionTitle = element(by.id(this.testID.userPositionTitle));
    userPositionDescription = element(by.id(this.testID.userPositionDescription));
    userLocalTimeTitle = element(by.id(this.testID.userLocalTimeTitle));
    userLocalTimeDescription = element(by.id(this.testID.userLocalTimeDescription));

    getUserProfilePicture = (userId: string) => {
        return element(ProfilePicture.getProfilePictureItemMatcher(this.testID.userProfileAvatarPrefix, userId));
    };

    toBeVisible = async () => {
        await waitFor(this.userProfileScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.userProfileScreen;
    };

    close = async () => {
        await this.userProfileBackdrop.tap({x: 5, y: 10});
        await expect(this.userProfileScreen).not.toBeVisible();
    };
}

const userProfileScreen = new UserProfileScreen();
export default userProfileScreen;
