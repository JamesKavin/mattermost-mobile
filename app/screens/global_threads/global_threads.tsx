// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {setGlobalThreadsTab} from '@actions/local/systems';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {useServerUrl} from '@context/server';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {popTopScreen} from '@screens/navigation';

import ThreadsList from './threads_list';

type Props = {
    componentId?: string;
    globalThreadsTab: GlobalThreadsTab;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const GlobalThreads = ({componentId, globalThreadsTab}: Props) => {
    const appState = useAppState();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const switchingTeam = useTeamSwitch();
    const isTablet = useIsTablet();

    const defaultHeight = useDefaultHeaderHeight();

    const [tab, setTab] = useState<GlobalThreadsTab>(globalThreadsTab);
    const mounted = useRef(false);

    const containerStyle = useMemo(() => {
        const marginTop = defaultHeight;
        return {flex: 1, marginTop};
    }, [defaultHeight]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            setGlobalThreadsTab(serverUrl, tab);
            mounted.current = false;
        };
    }, [serverUrl, tab]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    return (
        <SafeAreaView
            edges={edges}
            mode='margin'
            style={styles.flex}
            testID='global_threads.screen'
        >
            <NavigationHeader
                showBackButton={!isTablet}
                isLargeTitle={false}
                onBackPress={onBackPress}
                title={
                    intl.formatMessage({
                        id: 'threads',
                        defaultMessage: 'Threads',
                    })
                }
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
            {!switchingTeam &&
            <View style={containerStyle}>
                <ThreadsList
                    forceQueryAfterAppState={appState}
                    setTab={setTab}
                    tab={tab}
                    testID={'global_threads.threads_list'}
                />
            </View>
            }
        </SafeAreaView>
    );
};

export default GlobalThreads;
