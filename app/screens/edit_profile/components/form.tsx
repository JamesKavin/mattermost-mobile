// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef} from 'react';
import {MessageDescriptor, useIntl} from 'react-intl';
import {Keyboard, StyleSheet, View} from 'react-native';

import {FloatingTextInputRef} from '@components/floating_text_input_label';
import {useTheme} from '@context/theme';
import {t} from '@i18n';

import DisabledFields from './disabled_fields';
import EmailField from './email_field';
import Field from './field';

import type UserModel from '@typings/database/models/servers/user';
import type {FieldConfig, FieldSequence, UserInfo} from '@typings/screens/edit_profile';

type Props = {
    canSave: boolean;
    currentUser: UserModel;
    isTablet?: boolean;
    lockedFirstName: boolean;
    lockedLastName: boolean;
    lockedNickname: boolean;
    lockedPosition: boolean;
    onUpdateField: (fieldKey: string, name: string) => void;
    userInfo: UserInfo;
    submitUser: () => void;
}

const includesSsoService = (sso: string) => ['gitlab', 'google', 'office365'].includes(sso);
const isSAMLOrLDAP = (protocol: string) => ['ldap', 'saml'].includes(protocol);

const FIELDS: { [id: string]: MessageDescriptor } = {
    firstName: {
        id: t('user.settings.general.firstName'),
        defaultMessage: 'First Name',
    },
    lastName: {
        id: t('user.settings.general.lastName'),
        defaultMessage: 'Last Name',
    },
    username: {
        id: t('user.settings.general.username'),
        defaultMessage: 'Username',
    },
    nickname: {
        id: t('user.settings.general.nickname'),
        defaultMessage: 'Nickname',
    },
    position: {
        id: t('user.settings.general.position'),
        defaultMessage: 'Position',
    },
    email: {
        id: t('user.settings.general.email'),
        defaultMessage: 'Email',
    },
};

const styles = StyleSheet.create({
    footer: {
        height: 40,
        width: '100%',
    },
    separator: {
        height: 15,
    },
});

const ProfileForm = ({
    canSave, currentUser, isTablet,
    lockedFirstName, lockedLastName, lockedNickname, lockedPosition,
    onUpdateField, userInfo, submitUser,
}: Props) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();
    const firstNameRef = useRef<FloatingTextInputRef>(null);
    const lastNameRef = useRef<FloatingTextInputRef>(null);
    const usernameRef = useRef<FloatingTextInputRef>(null);
    const emailRef = useRef<FloatingTextInputRef>(null);
    const nicknameRef = useRef<FloatingTextInputRef>(null);
    const positionRef = useRef<FloatingTextInputRef>(null);

    const userProfileFields: FieldSequence = useMemo(() => {
        const service = currentUser.authService;
        return {
            firstName: {
                ref: firstNameRef,
                isDisabled: (isSAMLOrLDAP(service) && lockedFirstName) || includesSsoService(service),
            },
            lastName: {
                ref: lastNameRef,
                isDisabled: (isSAMLOrLDAP(service) && lockedLastName) || includesSsoService(service),
            },
            username: {
                ref: usernameRef,
                isDisabled: service !== '',
            },
            email: {
                ref: emailRef,
                isDisabled: true,
            },
            nickname: {
                ref: nicknameRef,
                isDisabled: isSAMLOrLDAP(service) && lockedNickname,
            },
            position: {
                ref: positionRef,
                isDisabled: isSAMLOrLDAP(service) && lockedPosition,
            },
        };
    }, [lockedFirstName, lockedLastName, lockedNickname, lockedPosition, currentUser.authService]);

    const onFocusNextField = useCallback(((fieldKey: string) => {
        const findNextField = () => {
            const fields = Object.keys(userProfileFields);
            const curIndex = fields.indexOf(fieldKey);
            const searchIndex = curIndex + 1;

            if (curIndex === -1 || searchIndex > fields.length) {
                return undefined;
            }

            const remainingFields = fields.slice(searchIndex);

            const nextFieldIndex = remainingFields.findIndex((f: string) => {
                const field = userProfileFields[f];
                return !field.isDisabled;
            });

            if (nextFieldIndex === -1) {
                return {isLastEnabledField: true, nextField: undefined};
            }

            const fieldName = remainingFields[nextFieldIndex];

            return {isLastEnabledField: false, nextField: userProfileFields[fieldName]};
        };

        const next = findNextField();
        if (next?.isLastEnabledField && canSave) {
            // performs form submission
            Keyboard.dismiss();
            submitUser();
        } else if (next?.nextField) {
            next?.nextField?.ref?.current?.focus();
        } else {
            Keyboard.dismiss();
        }
    }), [canSave, userProfileFields]);

    const hasDisabledFields = Object.values(userProfileFields).filter((field) => field.isDisabled).length > 0;

    const fieldConfig: FieldConfig = {
        blurOnSubmit: false,
        enablesReturnKeyAutomatically: true,
        onFocusNextField,
        onTextChange: onUpdateField,
        returnKeyType: 'next',
    };

    return (
        <>
            {hasDisabledFields && <DisabledFields isTablet={isTablet}/>}
            <Field
                fieldKey='firstName'
                fieldRef={firstNameRef}
                isDisabled={userProfileFields.firstName.isDisabled}
                label={formatMessage(FIELDS.firstName)}
                testID='edit_profile_form.first_name'
                value={userInfo.firstName}
                {...fieldConfig}
            />
            <View style={styles.separator}/>
            <Field
                fieldKey='lastName'
                fieldRef={lastNameRef}
                isDisabled={userProfileFields.lastName.isDisabled}
                label={formatMessage(FIELDS.lastName)}
                testID='edit_profile_form.last_name'
                value={userInfo.lastName}
                {...fieldConfig}
            />
            <View style={styles.separator}/>
            <Field
                fieldKey='username'
                fieldRef={usernameRef}
                isDisabled={userProfileFields.username.isDisabled}
                label={formatMessage(FIELDS.username)}
                maxLength={22}
                testID='edit_profile_form.username'
                value={userInfo.username}
                {...fieldConfig}
            />
            <View style={styles.separator}/>
            {userInfo.email && (
                <EmailField
                    authService={currentUser.authService}
                    isDisabled={userProfileFields.email.isDisabled}
                    email={userInfo.email}
                    label={formatMessage(FIELDS.email)}
                    fieldRef={emailRef}
                    onChange={onUpdateField}
                    onFocusNextField={onFocusNextField}
                    theme={theme}
                    isTablet={Boolean(isTablet)}
                />
            )}
            <View style={styles.separator}/>
            <Field
                fieldKey='nickname'
                fieldRef={nicknameRef}
                isDisabled={userProfileFields.nickname.isDisabled}
                label={formatMessage(FIELDS.nickname)}
                maxLength={22}
                testID='edit_profile_form.nickname'
                value={userInfo.nickname}
                {...fieldConfig}
            />
            <View style={styles.separator}/>
            <Field
                fieldKey='position'
                fieldRef={positionRef}
                isDisabled={userProfileFields.position.isDisabled}
                isOptional={true}
                label={formatMessage(FIELDS.position)}
                maxLength={128}
                {...fieldConfig}
                returnKeyType='done'
                testID='edit_profile_form.position'
                value={userInfo.position}
            />
            <View style={styles.footer}/>
        </>
    );
};

export default ProfileForm;
