// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {retryInitialChannel} from '@actions/remote/retry';
import LoadingError from '@components/channel_list/loading_error';
import {useServerUrl} from '@context/server';

type Props = {
    teamDisplayName: string;
    teamId: string;
}

const LoadChannelsError = ({teamDisplayName, teamId}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const [loading, setLoading] = useState(false);

    const onRetryTeams = useCallback(async () => {
        setLoading(true);
        const {error} = await retryInitialChannel(serverUrl, teamId);

        if (error) {
            setLoading(false);
        }
    }, [teamId]);

    return (
        <LoadingError
            loading={loading}
            message={formatMessage({id: 'load_channels_error.message', defaultMessage: 'There was a problem loading content for this team.'})}
            onRetry={onRetryTeams}
            title={formatMessage({id: 'load_channels_error.title', defaultMessage: "Couldn't load {teamDisplayName}"}, {teamDisplayName})}
        />
    );
};

export default LoadChannelsError;
