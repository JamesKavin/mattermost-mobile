// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {getFormattedFileSize} from '@utils/file';
import {makeStyleSheetFromTheme} from '@utils/theme';

type FileInfoProps = {
    file: FileInfo;
    onPress: () => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        attachmentContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        fileDownloadContainer: {
            flexDirection: 'row',
            marginTop: 3,
        },
        fileInfo: {
            fontSize: 14,
            color: theme.centerChannelColor,
        },
        fileName: {
            flexDirection: 'column',
            flexWrap: 'wrap',
            fontSize: 14,
            fontFamily: 'OpenSans-SemiBold',
            color: theme.centerChannelColor,
            paddingRight: 10,
        },
    };
});

const FileInfo = ({file, onPress, theme}: FileInfoProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.attachmentContainer}>
            <TouchableOpacity onPress={onPress}>
                <Text
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    style={style.fileName}
                >
                    {file.name.trim()}
                </Text>
                <View style={style.fileDownloadContainer}>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={style.fileInfo}
                    >
                        {`${getFormattedFileSize(file.size)}`}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default FileInfo;
