// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const generateGroupAssociationId = (groupId: string, otherId: string) => `${groupId}-${otherId}`;
