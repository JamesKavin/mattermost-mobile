// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import emojiRegex from 'emoji-regex';

import SystemModel from '@database/models/server/system';

import {Emojis, EmojiIndicesByAlias} from './';

const RE_NAMED_EMOJI = /(:([a-zA-Z0-9_+-]+):)/g;

const RE_UNICODE_EMOJI = emojiRegex();

const RE_EMOTICON: Record<string, RegExp> = {
    slightly_smiling_face: /(^|\s)(:-?\))(?=$|\s)/g, // :)
    wink: /(^|\s)(;-?\))(?=$|\s)/g, // ;)
    open_mouth: /(^|\s)(:o)(?=$|\s)/gi, // :o
    scream: /(^|\s)(:-o)(?=$|\s)/gi, // :-o
    smirk: /(^|\s)(:-?])(?=$|\s)/g, // :]
    smile: /(^|\s)(:-?d)(?=$|\s)/gi, // :D
    stuck_out_tongue_closed_eyes: /(^|\s)(x-d)(?=$|\s)/gi, // x-d
    stuck_out_tongue: /(^|\s)(:-?p)(?=$|\s)/gi, // :p
    rage: /(^|\s)(:-?[[@])(?=$|\s)/g, // :@
    slightly_frowning_face: /(^|\s)(:-?\()(?=$|\s)/g, // :(
    cry: /(^|\s)(:[`'’]-?\(|:&#x27;\(|:&#39;\()(?=$|\s)/g, // :`(
    confused: /(^|\s)(:-?\/)(?=$|\s)/g, // :/
    confounded: /(^|\s)(:-?s)(?=$|\s)/gi, // :s
    neutral_face: /(^|\s)(:-?\|)(?=$|\s)/g, // :|
    flushed: /(^|\s)(:-?\$)(?=$|\s)/g, // :$
    mask: /(^|\s)(:-x)(?=$|\s)/gi, // :-x
    heart: /(^|\s)(<3|&lt;3)(?=$|\s)/g, // <3
    broken_heart: /(^|\s)(<\/3|&lt;&#x2F;3)(?=$|\s)/g, // </3
};

const MAX_JUMBO_EMOJIS = 8;

function isEmoticon(text: string) {
    for (const emoticon of Object.keys(RE_EMOTICON)) {
        const reEmoticon = RE_EMOTICON[emoticon];
        const matchEmoticon = text.match(reEmoticon);
        if (matchEmoticon && matchEmoticon[0] === text) {
            return true;
        }
    }

    return false;
}

export function getEmoticonName(value: string) {
    return Object.keys(RE_EMOTICON).find((key) => value.match(RE_EMOTICON[key]) !== null);
}

export function hasJumboEmojiOnly(message: string, customEmojis: string[]) {
    let emojiCount = 0;
    const chunks = message.trim().replace(/\n/g, ' ').split(' ').filter((m) => m && m.length > 0);
    if (chunks.length === 0) {
        return false;
    }

    for (const chunk of chunks) {
        if (doesMatchNamedEmoji(chunk)) {
            const emojiName = chunk.substring(1, chunk.length - 1);
            if (EmojiIndicesByAlias.has(emojiName)) {
                emojiCount++;
                continue;
            }

            if (customEmojis && customEmojis.includes(emojiName)) {
                emojiCount++;
                continue;
            }
        }

        const matchUnicodeEmoji = chunk.match(RE_UNICODE_EMOJI);
        if (matchUnicodeEmoji && matchUnicodeEmoji.join('') === chunk) {
            emojiCount += matchUnicodeEmoji.length;
            continue;
        }

        if (isEmoticon(chunk)) {
            emojiCount++;
            continue;
        }

        return false;
    }

    return emojiCount > 0 && emojiCount <= MAX_JUMBO_EMOJIS;
}

export function doesMatchNamedEmoji(emojiName: string) {
    const match = emojiName.match(RE_NAMED_EMOJI);

    if (match && match[0] === emojiName) {
        return true;
    }

    return false;
}

export function getEmojiByName(emojiName: string) {
    if (EmojiIndicesByAlias.has(emojiName)) {
        return Emojis[EmojiIndicesByAlias.get(emojiName)!];
    }

    return null;
}

// Since there is no shared logic between the web and mobile app
// this is copied from the webapp as custom sorting logic for emojis

const defaultComparisonRule = (aName: string, bName: string) => {
    return aName.localeCompare(bName);
};

const thumbsDownComparisonRule = (other: string) => (other.startsWith('thumbsup') || other.startsWith('+1') ? 1 : 0);

const thumbsUpComparisonRule = (other: string) => (other.startsWith('thumbsdown') || other.startsWith('-1') ? -1 : 0);

type Comparators = Record<string, ((other: string) => number)>;

const customComparisonRules: Comparators = {
    thumbsdown: thumbsDownComparisonRule,
    '-1': thumbsDownComparisonRule,
    thumbsup: thumbsUpComparisonRule,
    '+1': thumbsUpComparisonRule,
};

function doDefaultComparison(aName: string, bName: string) {
    const rule = aName.split('_')[0];
    if (customComparisonRules[rule]) {
        return customComparisonRules[rule](bName) || defaultComparisonRule(aName, bName);
    }

    return defaultComparisonRule(aName, bName);
}

type EmojiType = {
    short_name: string;
    name: string;
}

export function compareEmojis(emojiA: string | Partial<EmojiType>, emojiB: string | Partial<EmojiType>, searchedName: string) {
    if (!emojiA) {
        return 1;
    }

    if (!emojiB) {
        return -1;
    }
    let aName;
    if (typeof emojiA === 'string') {
        aName = emojiA;
    } else {
        aName = 'short_name' in emojiA ? emojiA.short_name : emojiA.name;
    }
    let bName;
    if (typeof emojiB === 'string') {
        bName = emojiB;
    } else {
        bName = 'short_name' in emojiB ? emojiB.short_name : emojiB.name;
    }

    if (!searchedName) {
        return doDefaultComparison(aName!, bName!);
    }

    // Have the emojis that start with the search appear first
    const aPrefix = aName!.startsWith(searchedName);
    const bPrefix = bName!.startsWith(searchedName);

    if (aPrefix && bPrefix) {
        return doDefaultComparison(aName!, bName!);
    } else if (aPrefix) {
        return -1;
    } else if (bPrefix) {
        return 1;
    }

    // Have the emojis that contain the search appear next
    const aIncludes = aName!.includes(searchedName);
    const bIncludes = bName!.includes(searchedName);

    if (aIncludes && bIncludes) {
        return doDefaultComparison(aName!, bName!);
    } else if (aIncludes) {
        return -1;
    } else if (bIncludes) {
        return 1;
    }

    return doDefaultComparison(aName!, bName!);
}

export const isCustomEmojiEnabled = (config: ClientConfig | SystemModel) => {
    if (config instanceof SystemModel) {
        return config?.value?.EnableCustomEmoji === 'true';
    }

    return config?.EnableCustomEmoji === 'true';
};

export function fillEmoji(index: number) {
    const emoji = Emojis[index];
    return {
        name: 'short_name' in emoji ? emoji.short_name : emoji.name,
        aliases: 'short_names' in emoji ? emoji.short_names : [],
    };
}

export function getSkin(emoji: any) {
    if ('skin_variations' in emoji) {
        return 'default';
    }
    if ('skins' in emoji) {
        return emoji.skins && emoji.skins[0];
    }
    return null;
}
