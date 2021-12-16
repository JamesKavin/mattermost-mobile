// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import FormattedText from '@components/formatted_text';

// @ts-expect-error svg extension
import Mention from './mention_icon.svg';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 400),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

function EmptyMentions() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <Mention style={styles.icon}/>
            <FormattedText
                defaultMessage='No Mentions yet'
                id='mentions.empty.title'
                style={styles.title}
                testID='empty.mentions.title'
            />
            <FormattedText
                defaultMessage={'You\'ll see messages here when someone mentions you or uses terms you\'re monitoring.'}
                id='mentions.empty.paragraph'
                style={styles.paragraph}
                testID='mentions.empty.paragraph'
            />
        </View>
    );
}

export default EmptyMentions;
