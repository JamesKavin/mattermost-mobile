// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, StyleSheet, TextStyle, View} from 'react-native';

import Markdown from '@components/markdown';

import type {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
    blockStyles?: MarkdownBlockStyles;
    channelId: string;
    location: string;
    metadata?: PostMetadata;
    textStyles?: MarkdownTextStyles;
    theme: Theme;
    value?: string;
}

const style = StyleSheet.create({
    container: {
        marginTop: 5,
    },
});

export default function AttachmentPreText(props: Props) {
    const {
        baseTextStyle,
        blockStyles,
        metadata,
        value,
        textStyles,
    } = props;

    if (!value) {
        return null;
    }

    return (
        <View style={style.container}>
            <Markdown
                baseTextStyle={baseTextStyle}
                channelId={props.channelId}
                textStyles={textStyles}
                blockStyles={blockStyles}
                disableGallery={true}
                imagesMetadata={metadata?.images}
                location={props.location}
                theme={props.theme}
                value={value}
            />
        </View>
    );
}
