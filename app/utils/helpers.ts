// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// isMinimumServerVersion will return true if currentVersion is equal to higher or than
// the provided minimum version. A non-equal major version will ignore minor and dot
// versions, and a non-equal minor version will ignore dot version.
// currentVersion is a string, e.g '4.6.0'
// minMajorVersion, minMinorVersion, minDotVersion are integers

export const isMinimumServerVersion = (currentVersion: string, minMajorVersion = 0, minMinorVersion = 0, minDotVersion = 0): boolean => {
    if (!currentVersion || typeof currentVersion !== 'string') {
        return false;
    }

    const split = currentVersion.split('.');

    const major = parseInt(split[0], 10);
    const minor = parseInt(split[1] || '0', 10);
    const dot = parseInt(split[2] || '0', 10);

    if (major > minMajorVersion) {
        return true;
    }
    if (major < minMajorVersion) {
        return false;
    }

    // Major version is equal, check minor
    if (minor > minMinorVersion) {
        return true;
    }
    if (minor < minMinorVersion) {
        return false;
    }

    // Minor version is equal, check dot
    if (dot > minDotVersion) {
        return true;
    }
    if (dot < minDotVersion) {
        return false;
    }

    // Dot version is equal
    return true;
};

export function buildQueryString(parameters: Dictionary<any>): string {
    const keys = Object.keys(parameters);
    if (keys.length === 0) {
        return '';
    }

    let query = '?';
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        query += key + '=' + encodeURIComponent(parameters[key]);

        if (i < keys.length - 1) {
            query += '&';
        }
    }

    return query;
}

export function isEmail(email: string): boolean {
    // writing a regex to match all valid email addresses is really, really hard. (see http://stackoverflow.com/a/201378)
    // this regex ensures:
    // - at least one character that is not a space, comma, or @ symbol
    // - followed by a single @ symbol
    // - followed by at least one character that is not a space, comma, or @ symbol
    // this prevents <Outlook Style> outlook.style@domain.com addresses and multiple comma-separated addresses from being accepted
    return (/^[^ ,@]+@[^ ,@]+$/).test(email);
}

export function safeParseJSON(rawJson: string | Record<string, unknown>) {
    let data = rawJson;
    try {
        if (typeof rawJson == 'string') {
            data = JSON.parse(rawJson);
        }
    } catch {
        // Do nothing
    }

    return data;
}
