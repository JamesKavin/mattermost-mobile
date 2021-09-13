// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode} from 'react';
import {StyleSheet, TextStyle, View, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';

type MarkdownBlockQuoteProps = {
    continueBlock?: boolean;
    iconStyle: ViewStyle | TextStyle;
    children: ReactNode | ReactNode[];
};

const style = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        flexDirection: 'row',
    },
    childContainer: {
        flex: 1,
    },
    icon: {
        width: 23,
    },
});

const MarkdownBlockQuote = ({children, continueBlock, iconStyle}: MarkdownBlockQuoteProps) => {
    return (
        <View
            style={style.container}
            testID='markdown_block_quote'
        >
            {!continueBlock && (
                <View style={style.icon}>
                    <CompassIcon
                        name='format-quote-open'
                        style={iconStyle}
                        size={20}
                    />
                </View>
            )}
            <View style={style.childContainer}>{children}</View>
        </View>
    );
};

export default MarkdownBlockQuote;
