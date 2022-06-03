// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';
import {OptionsModalPresentationStyle} from 'react-native-navigation';

import {dismissAllModals, showModalOverCurrentContext} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

let showingPermalink = false;

export const displayPermalink = async (teamName: string, postId: string, openAsPermalink = true) => {
    Keyboard.dismiss();
    if (showingPermalink) {
        await dismissAllModals();
    }

    const screen = 'Permalink';
    const passProps = {
        isPermalink: openAsPermalink,
        teamName,
        postId,
    };

    const options = {
        modalPresentationStyle: OptionsModalPresentationStyle.overFullScreen,
        layout: {
            componentBackgroundColor: changeOpacity('#000', 0.2),
        },
    };

    showingPermalink = true;
    showModalOverCurrentContext(screen, passProps, options);
};

export const closePermalink = () => {
    showingPermalink = false;
};
