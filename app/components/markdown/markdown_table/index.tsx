// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent, ReactNode} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {Dimensions, EventSubscription, LayoutChangeEvent, Platform, ScaledSize, ScrollView, StyleProp, TouchableOpacity, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import CompassIcon from '@components/compass_icon';
import {CELL_MAX_WIDTH, CELL_MIN_WIDTH} from '@components/markdown/markdown_table_cell';
import {Screens, Device} from '@constants';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const MAX_HEIGHT = 300;
const MAX_PREVIEW_COLUMNS = 5;

type MarkdownTableState = {
    cellWidth: number;
    containerWidth: number;
    contentHeight: number;
    maxPreviewColumns: number;
}

type MarkdownTableInputProps = {
    children: ReactNode;
    numColumns: number;
}

type MarkdownTableProps = MarkdownTableInputProps & {
    intl: IntlShape;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            maxHeight: MAX_HEIGHT,
        },
        expandButton: {
            height: 34,
            width: 34,
        },
        iconContainer: {
            maxWidth: '100%',
            alignItems: 'flex-end',
            paddingTop: 8,
            paddingBottom: 4,
            ...Platform.select({
                ios: {
                    paddingRight: 14,
                },
            }),
        },
        iconButton: {
            backgroundColor: theme.centerChannelBg,
            marginTop: -32,
            marginRight: -6,
            borderWidth: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 50,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            width: 34,
            height: 34,
        },
        icon: {
            fontSize: 14,
            color: theme.linkColor,
            ...Platform.select({
                ios: {
                    fontSize: 13,
                },
            }),
        },
        displayFlex: {
            flex: 1,
        },
        table: {
            width: '100%',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
        },
        tablePadding: {
            paddingRight: 10,
        },
        moreBelow: {
            bottom: Platform.select({
                ios: 34,
                android: 33.75,
            }),
            height: 20,
            position: 'absolute',
            left: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        moreRight: {
            maxHeight: MAX_HEIGHT,
            position: 'absolute',
            top: 0,
            width: 20,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
        },
    };
});

class MarkdownTable extends PureComponent<MarkdownTableProps, MarkdownTableState> {
    private rowsSliced: boolean | undefined;
    private colsSliced: boolean | undefined;
    private dimensionsListener: EventSubscription | undefined;

    state = {
        containerWidth: 0,
        contentHeight: 0,
        cellWidth: 0,
        maxPreviewColumns: 0,
    };

    componentDidMount() {
        this.dimensionsListener = Dimensions.addEventListener('change', this.setMaxPreviewColumns);

        const window = Dimensions.get('window');
        this.setMaxPreviewColumns({window});
    }

    componentWillUnmount() {
        this.dimensionsListener?.remove();
    }

    setMaxPreviewColumns = ({window}: {window: ScaledSize}) => {
        const maxPreviewColumns = Math.floor(window.width / CELL_MIN_WIDTH);
        this.setState({maxPreviewColumns});
    };

    getTableWidth = (isFullView = false) => {
        const maxPreviewColumns = this.state.maxPreviewColumns || MAX_PREVIEW_COLUMNS;
        const columns = Math.min(this.props.numColumns, maxPreviewColumns);

        return (isFullView || columns === 1) ? columns * CELL_MAX_WIDTH : columns * CELL_MIN_WIDTH;
    };

    handlePress = preventDoubleTap(() => {
        const {intl} = this.props;
        const screen = Screens.TABLE;
        const title = intl.formatMessage({
            id: 'mobile.routes.table',
            defaultMessage: 'Table',
        });
        const passProps = {
            renderAsFlex: this.shouldRenderAsFlex(true),
            renderRows: this.renderRows,
            width: this.getTableWidth(true),
        };

        goToScreen(screen, title, passProps);
    });

    handleContainerLayout = (e: LayoutChangeEvent) => {
        this.setState({
            containerWidth: e.nativeEvent.layout.width,
        });
    };

    handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
        this.setState({
            contentHeight,
        });
    };

    renderPreviewRows = (isFullView = false) => {
        return this.renderRows(isFullView, true);
    };

    shouldRenderAsFlex = (isFullView = false) => {
        const {numColumns} = this.props;
        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;

        // render as flex in the channel screen, only for mobile phones on the portrait mode,
        // and if tables have 2 ~ 4 columns
        if (!isFullView && numColumns > 1 && numColumns < 4 && !Device.IS_TABLET) {
            return true;
        }

        // render a 4 column table as flex when in landscape mode only
        // otherwise it should expand beyond the device's full width
        if (!isFullView && isLandscape && numColumns === 4) {
            return true;
        }

        // render as flex in full table screen, only for mobile phones on portrait mode,
        // and if tables have 3 or 4 columns
        if (isFullView && numColumns >= 3 && numColumns <= 4 && !Device.IS_TABLET) {
            return true;
        }

        return false;
    };

    getTableStyle = (isFullView: boolean) => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        const tableStyle: StyleProp<ViewStyle> = [style.table];

        const renderAsFlex = this.shouldRenderAsFlex(isFullView);
        if (renderAsFlex) {
            tableStyle.push(style.displayFlex);
            return tableStyle;
        }

        tableStyle.push({width: this.getTableWidth(isFullView)});
        return tableStyle;
    };

    renderRows = (isFullView = false, isPreview = false) => {
        const tableStyle = this.getTableStyle(isFullView);

        let rows = React.Children.toArray(this.props.children) as React.ReactElement[];
        if (isPreview) {
            const {maxPreviewColumns} = this.state;
            const prevRowLength = rows.length;
            const prevColLength = React.Children.toArray(rows[0].props.children).length;

            rows = rows.slice(0, maxPreviewColumns).map((row) => {
                const children = React.Children.toArray(row.props.children).slice(0, maxPreviewColumns);
                return {
                    ...row,
                    props: {
                        ...row.props,
                        children,
                    },
                };
            });

            if (!rows.length) {
                return null;
            }

            this.rowsSliced = prevRowLength > rows.length;
            this.colsSliced = prevColLength > React.Children.toArray(rows[0].props.children).length;
        }

        // Add an extra prop to the last row of the table so that it knows not to render a bottom border
        // since the container should be rendering that
        rows[rows.length - 1] = React.cloneElement(rows[rows.length - 1], {
            isLastRow: true,
        });

        // Add an extra prop to the first row of the table so that it can have a different background color
        rows[0] = React.cloneElement(rows[0], {
            isFirstRow: true,
        });

        return (
            <View style={tableStyle}>
                {rows}
            </View>
        );
    };

    render() {
        const {containerWidth, contentHeight} = this.state;
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        const tableWidth = this.getTableWidth();
        const renderAsFlex = this.shouldRenderAsFlex();
        const previewRows = this.renderPreviewRows();

        let leftOffset;
        if (renderAsFlex || tableWidth > containerWidth) {
            leftOffset = containerWidth - 20;
        } else {
            leftOffset = tableWidth - 20;
        }
        let expandButtonOffset = leftOffset;
        if (Platform.OS === 'android') {
            expandButtonOffset -= 10;
        }

        // Renders when the columns were sliced, or the table width exceeds the container,
        // or if the columns exceed maximum allowed for previews
        let moreRight = null;
        if (this.colsSliced ||
            (containerWidth && tableWidth > containerWidth && !renderAsFlex) ||
            (this.props.numColumns > MAX_PREVIEW_COLUMNS)) {
            moreRight = (
                <LinearGradient
                    colors={[
                        changeOpacity(theme.centerChannelColor, 0.0),
                        changeOpacity(theme.centerChannelColor, 0.1),
                    ]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[style.moreRight, {height: contentHeight, left: leftOffset}]}
                />
            );
        }

        let moreBelow = null;
        if (this.rowsSliced || contentHeight > MAX_HEIGHT) {
            const width = renderAsFlex ? '100%' : Math.min(tableWidth, containerWidth);

            moreBelow = (
                <LinearGradient
                    colors={[
                        changeOpacity(theme.centerChannelColor, 0.0),
                        changeOpacity(theme.centerChannelColor, 0.1),
                    ]}
                    style={[style.moreBelow, {width}]}
                />
            );
        }

        let expandButton = null;
        if (expandButtonOffset > 0) {
            expandButton = (
                <TouchableOpacity
                    onPress={this.handlePress}
                    style={[style.expandButton, {left: expandButtonOffset}]}
                    testID='markdown_table.expand.button'
                >
                    <View style={[style.iconContainer, {width: this.getTableWidth()}]}>
                        <View style={style.iconButton}>
                            <CompassIcon
                                name='arrow-expand'
                                style={style.icon}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={style.tablePadding}
                onPress={this.handlePress}
                testID='markdown_table'
            >
                <ScrollView
                    onContentSizeChange={this.handleContentSizeChange}
                    onLayout={this.handleContainerLayout}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    style={style.container}
                >
                    {previewRows}
                </ScrollView>
                {moreRight}
                {moreBelow}
                {expandButton}
            </TouchableOpacity>
        );
    }
}

export default injectIntl(MarkdownTable);
