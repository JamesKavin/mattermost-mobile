// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$, combineLatest} from 'rxjs';

import {Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';

import Opengraph from './opengraph';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables(
    ['removeLinkPreview'],
    ({database, removeLinkPreview}: WithDatabaseArgs & {removeLinkPreview: boolean}) => {
        if (removeLinkPreview) {
            return {showLinkPreviews: of$(false)};
        }

        const linkPreviewsConfig = observeConfigBooleanValue(database, 'EnableLinkPreviews');
        const linkPreviewPreference = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY).
            observeWithColumns(['value']);
        const showLinkPreviews = combineLatest([linkPreviewsConfig, linkPreviewPreference], (cfg, pref) => {
            const previewsEnabled = getPreferenceAsBool(pref, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true);
            return of$(previewsEnabled && cfg);
        });

        return {showLinkPreviews};
    },
);

export default withDatabase(enhance(Opengraph));
