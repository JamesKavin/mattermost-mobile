// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type AppManifest = {
    app_id: string;
    display_name: string;
    description?: string;
    homepage_url?: string;
    root_url: string;
};

type AppModalState = {
    form: AppForm;
    call: AppCallRequest;
};

type AppsState = {
    bindings: AppBinding[];
};

type AppBinding = {
    app_id: string;
    location?: string;
    icon?: string;

    // Label is the (usually short) primary text to display at the location.
    // - For LocationPostMenu is the menu item text.
    // - For LocationChannelHeader is the dropdown text.
    // - For LocationCommand is the name of the command
    label: string;

    // Hint is the secondary text to display
    // - LocationPostMenu: not used
    // - LocationChannelHeader: tooltip
    // - LocationCommand: the "Hint" line
    hint?: string;

    // Description is the (optional) extended help text, used in modals and autocomplete
    description?: string;

    role_id?: string;
    depends_on_team?: boolean;
    depends_on_channel?: boolean;
    depends_on_user?: boolean;
    depends_on_post?: boolean;

    // A Binding is either to a Call, or is a "container" for other locations -
    // i.e. menu sub-items or subcommands.
    call?: AppCall;
    bindings?: AppBinding[];
    form?: AppForm;
};

type AppCallValues = {
    [name: string]: any;
};

type AppCallType = string;

type AppCall = {
    path: string;
    expand?: AppExpand;
    state?: any;
};

type AppCallRequest = AppCall & {
    context: AppContext;
    values?: AppCallValues;
    raw_command?: string;
    selected_field?: string;
    query?: string;
};

type AppCallResponseType = string;

type AppCallResponse<Res = unknown> = {
    type: AppCallResponseType;
    markdown?: string;
    data?: Res;
    error?: string;
    navigate_to_url?: string;
    use_external_browser?: boolean;
    call?: AppCall;
    form?: AppForm;
    app_metadata?: AppMetadataForClient;
};

type AppMetadataForClient = {
    bot_user_id: string;
    bot_username: string;
};

type AppContext = {
    app_id: string;
    location?: string;
    acting_user_id?: string;
    user_id?: string;
    channel_id?: string;
    team_id?: string;
    post_id?: string;
    root_id?: string;
    props?: AppContextProps;
    user_agent?: string;
};

type AppContextProps = {
    [name: string]: string;
};

type AppExpandLevel = string;

type AppExpand = {
    app?: AppExpandLevel;
    acting_user?: AppExpandLevel;
    channel?: AppExpandLevel;
    config?: AppExpandLevel;
    mentioned?: AppExpandLevel;
    parent_post?: AppExpandLevel;
    post?: AppExpandLevel;
    root_post?: AppExpandLevel;
    team?: AppExpandLevel;
    user?: AppExpandLevel;
};

type AppForm = {
    title?: string;
    header?: string;
    footer?: string;
    icon?: string;
    submit_buttons?: string;
    cancel_button?: boolean;
    submit_on_cancel?: boolean;
    fields: AppField[];
    call?: AppCall;
    depends_on?: string[];
};

type AppFormValue = string | AppSelectOption | boolean | null;
type AppFormValues = {[name: string]: AppFormValue};

type AppSelectOption = {
    label: string;
    value: string;
    icon_data?: string;
};

type AppFieldType = string;

// This should go in mattermost-redux
type AppField = {

    // Name is the name of the JSON field to use.
    name: string;
    type: AppFieldType;
    is_required?: boolean;
    readonly?: boolean;

    // Present (default) value of the field
    value?: AppFormValue;

    description?: string;

    label?: string;
    hint?: string;
    position?: number;

    modal_label?: string;

    // Select props
    refresh?: boolean;
    options?: AppSelectOption[];
    multiselect?: boolean;

    // Text props
    subtype?: string;
    min_length?: number;
    max_length?: number;
};

type AutocompleteSuggestion = {
    suggestion: string;
    complete?: string;
    description?: string;
    hint?: string;
    iconData?: string;
};

type AutocompleteSuggestionWithComplete = AutocompleteSuggestion & {
    complete: string;
};

type AutocompleteElement = AppField;
type AutocompleteStaticSelect = AutocompleteElement & {
    options: AppSelectOption[];
};

type AutocompleteDynamicSelect = AutocompleteElement;

type AutocompleteUserSelect = AutocompleteElement;

type AutocompleteChannelSelect = AutocompleteElement;

type FormResponseData = {
    errors?: {
        [field: string]: string;
    };
};

type AppLookupResponse = {
    items: AppSelectOption[];
};
