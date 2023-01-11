// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const ABOUT = 'About';
export const ACCOUNT = 'Account';
export const APPS_FORM = 'AppForm';
export const BOTTOM_SHEET = 'BottomSheet';
export const BROWSE_CHANNELS = 'BrowseChannels';
export const CALL = 'Call';
export const CHANNEL = 'Channel';
export const CHANNEL_ADD_PEOPLE = 'ChannelAddPeople';
export const CHANNEL_INFO = 'ChannelInfo';
export const CHANNEL_MENTION = 'ChannelMention';
export const CODE = 'Code';
export const CREATE_DIRECT_MESSAGE = 'CreateDirectMessage';
export const CREATE_OR_EDIT_CHANNEL = 'CreateOrEditChannel';
export const CREATE_TEAM = 'CreateTeam';
export const CUSTOM_STATUS = 'CustomStatus';
export const CUSTOM_STATUS_CLEAR_AFTER = 'CustomStatusClearAfter';
export const EDIT_POST = 'EditPost';
export const EDIT_PROFILE = 'EditProfile';
export const EDIT_SERVER = 'EditServer';
export const EMOJI_PICKER = 'EmojiPicker';
export const FIND_CHANNELS = 'FindChannels';
export const FORGOT_PASSWORD = 'ForgotPassword';
export const GALLERY = 'Gallery';
export const GLOBAL_THREADS = 'GlobalThreads';
export const HOME = 'Home';
export const INTEGRATION_SELECTOR = 'IntegrationSelector';
export const INTERACTIVE_DIALOG = 'InteractiveDialog';
export const IN_APP_NOTIFICATION = 'InAppNotification';
export const JOIN_TEAM = 'JoinTeam';
export const LATEX = 'Latex';
export const LOGIN = 'Login';
export const MENTIONS = 'Mentions';
export const MFA = 'MFA';
export const ONBOARDING = 'Onboarding';
export const PERMALINK = 'Permalink';
export const PINNED_MESSAGES = 'PinnedMessages';
export const POST_OPTIONS = 'PostOptions';
export const REACTIONS = 'Reactions';
export const REVIEW_APP = 'ReviewApp';
export const SAVED_MESSAGES = 'SavedMessages';
export const SEARCH = 'Search';
export const SELECT_TEAM = 'SelectTeam';
export const SERVER = 'Server';
export const SETTINGS = 'Settings';
export const SETTINGS_ADVANCED = 'SettingsAdvanced';
export const SETTINGS_DISPLAY = 'SettingsDisplay';
export const SETTINGS_DISPLAY_CLOCK = 'SettingsDisplayClock';
export const SETTINGS_DISPLAY_THEME = 'SettingsDisplayTheme';
export const SETTINGS_DISPLAY_TIMEZONE = 'SettingsDisplayTimezone';
export const SETTINGS_DISPLAY_TIMEZONE_SELECT = 'SettingsDisplayTimezoneSelect';
export const SETTINGS_NOTIFICATION = 'SettingsNotification';
export const SETTINGS_NOTIFICATION_AUTO_RESPONDER = 'SettingsNotificationAutoResponder';
export const SETTINGS_NOTIFICATION_EMAIL = 'SettingsNotificationEmail';
export const SETTINGS_NOTIFICATION_MENTION = 'SettingsNotificationMention';
export const SETTINGS_NOTIFICATION_PUSH = 'SettingsNotificationPush';
export const SHARE_FEEDBACK = 'ShareFeedback';
export const SNACK_BAR = 'SnackBar';
export const SSO = 'SSO';
export const TABLE = 'Table';
export const TERMS_OF_SERVICE = 'TermsOfService';
export const THREAD = 'Thread';
export const THREAD_FOLLOW_BUTTON = 'ThreadFollowButton';
export const THREAD_OPTIONS = 'ThreadOptions';
export const USER_PROFILE = 'UserProfile';

export default {
    ABOUT,
    ACCOUNT,
    APPS_FORM,
    BOTTOM_SHEET,
    BROWSE_CHANNELS,
    CALL,
    CHANNEL,
    CHANNEL_ADD_PEOPLE,
    CHANNEL_INFO,
    CHANNEL_MENTION,
    CODE,
    CREATE_DIRECT_MESSAGE,
    CREATE_OR_EDIT_CHANNEL,
    CREATE_TEAM,
    CUSTOM_STATUS,
    CUSTOM_STATUS_CLEAR_AFTER,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    EMOJI_PICKER,
    FIND_CHANNELS,
    FORGOT_PASSWORD,
    GALLERY,
    GLOBAL_THREADS,
    HOME,
    INTEGRATION_SELECTOR,
    INTERACTIVE_DIALOG,
    IN_APP_NOTIFICATION,
    JOIN_TEAM,
    LATEX,
    LOGIN,
    MENTIONS,
    MFA,
    ONBOARDING,
    PERMALINK,
    PINNED_MESSAGES,
    POST_OPTIONS,
    REACTIONS,
    REVIEW_APP,
    SAVED_MESSAGES,
    SEARCH,
    SELECT_TEAM,
    SERVER,
    SETTINGS,
    SETTINGS_ADVANCED,
    SETTINGS_DISPLAY,
    SETTINGS_DISPLAY_CLOCK,
    SETTINGS_DISPLAY_THEME,
    SETTINGS_DISPLAY_TIMEZONE,
    SETTINGS_DISPLAY_TIMEZONE_SELECT,
    SETTINGS_NOTIFICATION,
    SETTINGS_NOTIFICATION_AUTO_RESPONDER,
    SETTINGS_NOTIFICATION_EMAIL,
    SETTINGS_NOTIFICATION_MENTION,
    SETTINGS_NOTIFICATION_PUSH,
    SHARE_FEEDBACK,
    SNACK_BAR,
    SSO,
    TABLE,
    TERMS_OF_SERVICE,
    THREAD,
    THREAD_FOLLOW_BUTTON,
    THREAD_OPTIONS,
    USER_PROFILE,
};

export const MODAL_SCREENS_WITHOUT_BACK = new Set<string>([
    BROWSE_CHANNELS,
    CHANNEL_INFO,
    CREATE_DIRECT_MESSAGE,
    CREATE_TEAM,
    CUSTOM_STATUS,
    EDIT_POST,
    EDIT_PROFILE,
    EDIT_SERVER,
    FIND_CHANNELS,
    GALLERY,
    PERMALINK,
]);

export const SCREENS_WITH_TRANSPARENT_BACKGROUND = new Set<string>([
    PERMALINK,
    REVIEW_APP,
    SNACK_BAR,
]);

export const SCREENS_AS_BOTTOM_SHEET = new Set<string>([
    BOTTOM_SHEET,
    EMOJI_PICKER,
    POST_OPTIONS,
    THREAD_OPTIONS,
    REACTIONS,
    USER_PROFILE,
]);

export const NOT_READY = [
    CHANNEL_ADD_PEOPLE,
    CHANNEL_MENTION,
    CREATE_TEAM,
];
