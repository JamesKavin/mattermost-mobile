// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TextStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface ComponentProps {
    text: string | typeof FormattedText;
    theme: Theme;
    textStyle?: TextStyle;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    numberOfLines?: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        label: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 17,
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
    };
});

const CustomStatusText = ({text, theme, textStyle, ellipsizeMode, numberOfLines}: ComponentProps) => (
    <Text
        style={[getStyleSheet(theme).label, textStyle]}
        ellipsizeMode={ellipsizeMode}
        numberOfLines={numberOfLines}
    >
        {text}
    </Text>
);

export default CustomStatusText;
