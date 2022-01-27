// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {retryInitialTeamAndChannel} from '@actions/remote/retry';
import LoadingError from '@components/channel_list/loading_error';
import {useServerDisplayName, useServerUrl} from '@context/server';

const LoadTeamsError = () => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const serverName = useServerDisplayName();
    const [loading, setLoading] = useState(false);

    const onRetryTeams = useCallback(async () => {
        setLoading(true);
        const {error} = await retryInitialTeamAndChannel(serverUrl);

        if (error) {
            setLoading(false);
        }
    }, []);

    return (
        <LoadingError
            loading={loading}
            message={formatMessage({id: 'load_teams_error.message', defaultMessage: 'There was a problem loading content for this server.'})}
            onRetry={onRetryTeams}
            title={formatMessage({id: 'load_teams_error.title', defaultMessage: "Couldn't load {serverName}"}, {serverName})}
        />
    );
};

export default LoadTeamsError;
