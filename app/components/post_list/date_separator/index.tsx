// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';

import FormattedDate from '@components/formatted_date';
import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';

type DateSeparatorProps = {
    date: number | Date;
    style?: StyleProp<ViewStyle>;
    theme: Theme;
    timezone?: string | null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexDirection: 'row',
            marginVertical: 8,
        },
        line: {
            flex: 1,
            height: 1,
            backgroundColor: theme.centerChannelColor,
            opacity: 0.2,
        },
        date: {
            color: theme.centerChannelColor,
            fontFamily: 'OpenSans-Semibold',
            fontSize: 12,
            lineHeight: 16,
        },
    };
});

export function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function isToday(date: Date) {
    const now = new Date();

    return isSameDay(date, now);
}

export function isYesterday(date: Date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDay(date, yesterday);
}

const RecentDate = (props: DateSeparatorProps) => {
    const {date, ...otherProps} = props;
    const when = new Date(date);

    if (isToday(when)) {
        return (
            <FormattedText
                {...otherProps}
                id='date_separator.today'
                defaultMessage='Today'
            />
        );
    } else if (isYesterday(when)) {
        return (
            <FormattedText
                {...otherProps}
                id='date_separator.yesterday'
                defaultMessage='Yesterday'
            />
        );
    }

    return (
        <FormattedDate
            {...otherProps}
            value={date}
        />
    );
};

const DateSeparator = (props: DateSeparatorProps) => {
    const styles = getStyleSheet(props.theme);

    return (
        <View style={[styles.container, props.style]}>
            <View style={styles.line}/>
            <RecentDate
                {...props}
                style={styles.date}
            />
            <View style={styles.line}/>
        </View>
    );
};

export default DateSeparator;
