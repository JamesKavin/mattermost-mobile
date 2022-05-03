// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';

import EmojiSuggestion from './emoji_suggestion';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

const emptyEmojiList: CustomEmojiModel[] = [];
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isCustomEmojisEnabled = observeConfigBooleanValue(database, 'EnableCustomEmoji');
    return {
        customEmojis: isCustomEmojisEnabled.pipe(
            switchMap((enabled) => (enabled ?
                queryAllCustomEmojis(database).observe() :
                of$(emptyEmojiList)),
            ),
        ),
        skinTone: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_EMOJI, Preferences.EMOJI_SKINTONE).
            observeWithColumns(['value']).pipe(
                switchMap((prefs) => of$(prefs?.[0]?.value ?? 'default')),
            ),
    };
});

export default withDatabase(enhanced(EmojiSuggestion));
