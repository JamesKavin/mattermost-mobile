// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image, ImageSourcePropType, View} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Sso} from '@constants';
import {t} from '@i18n';
import {buttonBackgroundStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

type SsoInfo = {
    defaultMessage: string;
    id: string;
    imageSrc?: ImageSourcePropType;
    compassIcon?: string;
};

type Props = {
    goToSso: (ssoType: string) => void;
    ssoOnly: boolean;
    ssoOptions: Record<string, boolean>;
    theme: Theme;
}

const SsoOptions = ({goToSso, ssoOnly, ssoOptions, theme}: Props) => {
    const styles = getStyleSheet(theme);
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');

    const getSsoButtonOptions = ((ssoType: string): SsoInfo => {
        const sso: SsoInfo = {} as SsoInfo;
        switch (ssoType) {
            case Sso.SAML:
                sso.defaultMessage = 'SAML';
                sso.compassIcon = 'lock';
                sso.id = t('mobile.login_options.saml');
                break;
            case Sso.GITLAB:
                sso.defaultMessage = 'GitLab';
                sso.imageSrc = require('@assets/images/Icon_Gitlab.png');
                sso.id = t('mobile.login_options.gitlab');
                break;
            case Sso.GOOGLE:
                sso.defaultMessage = 'Google';
                sso.imageSrc = require('@assets/images/Icon_Google.png');
                sso.id = t('mobile.login_options.google');
                break;
            case Sso.OFFICE365:
                sso.defaultMessage = 'Office 365';
                sso.imageSrc = require('@assets/images/Icon_Office.png');
                sso.id = t('mobile.login_options.office365');
                break;
            case Sso.OPENID:
                sso.defaultMessage = 'Open ID';
                sso.id = t('mobile.login_options.openid');
                break;

            default:
        }
        return sso;
    });

    const enabledSSOs = Object.keys(ssoOptions).filter(
        (ssoType: string) => ssoOptions[ssoType],
    );

    let styleViewContainer;
    let styleButtonContainer;
    if (enabledSSOs.length === 2 && !ssoOnly) {
        styleViewContainer = styles.containerAsRow;
        styleButtonContainer = styles.buttonContainer;
    }

    const componentArray = [];
    for (const ssoType of enabledSSOs) {
        const {compassIcon, defaultMessage, id, imageSrc} = getSsoButtonOptions(ssoType);
        const handlePress = () => {
            goToSso(ssoType);
        };

        componentArray.push(
            <Button
                key={ssoType}
                onPress={handlePress}
                containerStyle={[styleButtonBackground, styleButtonContainer, styles.button]}
            >
                {imageSrc && (
                    <Image
                        key={'image' + ssoType}
                        source={imageSrc}
                        style={styles.logoStyle}
                    />
                )}
                {compassIcon &&
                <CompassIcon
                    name={compassIcon}
                    size={16}
                    color={theme.centerChannelColor}
                />
                }
                <View
                    style={styles.buttonTextContainer}
                >
                    {ssoOnly && (
                        <FormattedText
                            key={'pretext' + id}
                            id='mobile.login_options.sso_continue'
                            style={styles.buttonText}
                            defaultMessage={'Continue with '}
                            testID={'pretext' + id}
                        />
                    )}
                    <FormattedText
                        key={ssoType}
                        id={id}
                        style={styles.buttonText}
                        defaultMessage={defaultMessage}
                        testID={id}
                    />
                </View>
            </Button>,
        );
    }

    return (
        <View style={[styleViewContainer, styles.container]}>
            {componentArray}
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 24,
    },
    containerAsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonContainer: {
        width: '48%',
        marginRight: 8,
    },
    button: {
        marginVertical: 4,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
    },
    buttonTextContainer: {
        color: theme.centerChannelColor,
        flexDirection: 'row',
        marginLeft: 9,
    },
    buttonText: {
        color: theme.centerChannelColor,
        fontFamily: 'OpenSans-SemiBold',
        fontSize: 16,
        lineHeight: 18,
        top: 2,
    },
    logoStyle: {
        height: 18,
        marginRight: 5,
        width: 18,
    },
}));

export default SsoOptions;
