// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, useWindowDimensions, View, ViewStyle} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Animated, {AnimatedStyleProp} from 'react-native-reanimated';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useDefaultHeaderHeight} from '@hooks/header';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    index: number;
    onClose: () => void;
    style: AnimatedStyleProp<ViewStyle>;
    total: number;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity('#000', 0.6),
        borderBottomColor: changeOpacity('#fff', 0.4),
        borderBottomWidth: 1,
        flexDirection: 'row',
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    title: {
        ...typography('Heading', 300),
        color: 'white',
    },
});

const edges: Edge[] = ['left', 'right', 'top'];
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

const Header = ({index, onClose, style, total}: Props) => {
    const {width} = useWindowDimensions();
    const height = useDefaultHeaderHeight();
    const containerStyle = useMemo(() => [styles.container, {height}], [height]);
    const iconStyle = useMemo(() => [{width: height}, styles.icon], [height]);
    const titleStyle = useMemo(() => ({width: width - (height * 2)}), [height, width]);
    const titleValue = useMemo(() => ({index: index + 1, total}), [index, total]);

    return (
        <AnimatedSafeAreaView
            edges={edges}
            style={style}
        >
            <Animated.View style={containerStyle}>
                <TouchableOpacity
                    onPress={onClose}
                    style={iconStyle}
                >
                    <CompassIcon
                        color='white'
                        name='close'
                        size={24}
                    />
                </TouchableOpacity>
                <View style={titleStyle}>
                    <FormattedText
                        id='mobile.gallery.title'
                        defaultMessage='{index} of {total}'
                        style={styles.title}
                        values={titleValue}
                    />
                </View>
            </Animated.View>
        </AnimatedSafeAreaView>
    );
};

export default Header;
