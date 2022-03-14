// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

type Props = {
    icon?: string;
    link?: string;
    name?: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
        },
        icon: {
            height: 12,
            marginRight: 3,
            width: 12,
        },
        name: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 11,
        },
        link: {color: changeOpacity(theme.linkColor, 0.5)},
    };
});

const AttachmentAuthor = ({icon, link, name, theme}: Props) => {
    const intl = useIntl();
    const style = getStyleSheet(theme);

    const openLink = () => {
        if (link) {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    intl.formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            };

            tryOpenURL(link, onError);
        }
    };

    return (
        <View style={style.container}>
            {Boolean(icon) &&
            <FastImage
                source={{uri: icon}}
                key='author_icon'
                style={style.icon}
            />
            }
            {Boolean(name) &&
            <Text
                key='author_name'
                onPress={openLink}
                style={[style.name, Boolean(link) && style.link]}
            >
                {name}
            </Text>
            }
        </View>
    );
};

export default AttachmentAuthor;
