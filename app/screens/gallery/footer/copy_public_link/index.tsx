// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-community/clipboard';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {fetchPublicLink} from '@actions/remote/file';
import Toast from '@components/toast';
import {GALLERY_FOOTER_HEIGHT} from '@constants/gallery';
import {useServerUrl} from '@context/server';

type Props = {
    item: GalleryItemType;
    setAction: (action: GalleryAction) => void;
}

const styles = StyleSheet.create({
    error: {
        backgroundColor: '#D24B4E',
    },
    toast: {
        backgroundColor: '#3DB887', // intended hardcoded color
    },
});

const CopyPublicLink = ({item, setAction}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const [showToast, setShowToast] = useState<boolean|undefined>();
    const [error, setError] = useState('');
    const mounted = useRef(false);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: GALLERY_FOOTER_HEIGHT + 8,
        opacity: withTiming(showToast ? 1 : 0, {duration: 300}),
    }));

    const copyLink = async () => {
        try {
            const publicLink = await fetchPublicLink(serverUrl, item.id!);
            if ('link' in publicLink) {
                Clipboard.setString(publicLink.link);
            } else {
                setError(formatMessage({id: 'gallery.copy_link.failed', defaultMessage: 'Failed to copy link to clipboard'}));
            }
        } catch {
            setError(formatMessage({id: 'gallery.copy_link.failed', defaultMessage: 'Failed to copy link to clipboard'}));
        } finally {
            setShowToast(true);
            setTimeout(() => {
                if (mounted.current) {
                    setShowToast(false);
                }
            }, 3000);
        }
    };

    useEffect(() => {
        mounted.current = true;
        copyLink();

        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (showToast === false) {
            setTimeout(() => {
                if (mounted.current) {
                    setAction('none');
                }
            }, 350);
        }
    }, [showToast]);

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={error ? styles.error : styles.toast}
            message={error || formatMessage({id: 'public_link_copied', defaultMessage: 'Link copied to clipboard'})}
            iconName='check'
        />
    );
};

export default CopyPublicLink;
