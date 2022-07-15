// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, ScrollView, Text, View} from 'react-native';
import MathView from 'react-native-math-view';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {splitLatexCodeInLines} from '@utils/markdown/latex';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    content: string;
}

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const codeVerticalPadding = Platform.select({
        ios: 4,
        android: 0,
    });

    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            minHeight: '100%',
        },
        mathStyle: {
            color: theme.centerChannelColor,
        },
        scrollCode: {
            minHeight: '100%',
            flexDirection: 'column',
            paddingLeft: 10,
            paddingVertical: 10,
        },
        code: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginHorizontal: 5,
            paddingVertical: codeVerticalPadding,
        },
        errorText: {
            ...typography('Body', 100),
            marginHorizontal: 5,
            color: theme.errorTextColor,
        },
    };
});

const Latex = ({content}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const lines = splitLatexCodeInLines(content);

    const onErrorMessage = (errorMsg: Error) => {
        return <Text style={style.errorText}>{'Error: ' + errorMsg.message}</Text>;
    };

    const onRenderErrorMessage = ({error}: {error: Error}) => {
        return <Text style={style.errorText}>{'Render error: ' + error.message}</Text>;
    };

    return (
        <SafeAreaView
            edges={edges}
            style={style.scrollContainer}
        >
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                <ScrollView
                    style={style.scrollContainer}
                    contentContainerStyle={style.scrollCode}
                    horizontal={true}
                >
                    {lines.map((latexCode) => (
                        <View
                            style={style.code}
                            key={latexCode}
                        >
                            <MathView
                                math={latexCode}
                                onError={onErrorMessage}
                                renderError={onRenderErrorMessage}
                                resizeMode={'cover'}
                                style={style.mathStyle}
                            />
                        </View>
                    ))}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Latex;
