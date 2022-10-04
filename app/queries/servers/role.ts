// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Database as DatabaseConstants, General, Permissions} from '@constants';
import {isDMorGM} from '@utils/channel';
import {hasPermission} from '@utils/role';

import {observeChannel, observeMyChannel} from './channel';
import {observeMyTeam} from './team';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type RoleModel from '@typings/database/models/servers/role';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {ROLE} = DatabaseConstants.MM_TABLES.SERVER;

export const queryRoles = (database: Database) => {
    return database.collections.get<RoleModel>(ROLE).query();
};

export const getRoleById = async (database: Database, roleId: string): Promise<RoleModel|undefined> => {
    try {
        const role = (await database.get<RoleModel>(ROLE).find(roleId));
        return role;
    } catch {
        return undefined;
    }
};

export const queryRolesByNames = (database: Database, names: string[]) => {
    return database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(names)));
};

export function observePermissionForChannel(database: Database, channel: ChannelModel | null | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    if (!user || !channel) {
        return of$(defaultValue);
    }
    const myChannel = observeMyChannel(database, channel.id);
    const myTeam = channel.teamId ? observeMyTeam(database, channel.teamId) : of$(undefined);

    return combineLatest([myChannel, myTeam]).pipe(switchMap(([mc, mt]) => {
        const rolesArray = [...user.roles.split(' ')];
        if (mc) {
            rolesArray.push(...mc.roles.split(' '));
        }
        if (mt) {
            rolesArray.push(...mt.roles.split(' '));
        }
        return queryRolesByNames(database, rolesArray).observeWithColumns(['permissions']).pipe(
            switchMap((r) => of$(hasPermission(r, permission))),
        );
    }),
    distinctUntilChanged(),
    );
}

export function observePermissionForTeam(database: Database, team: TeamModel | undefined, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    if (!team || !user) {
        return of$(defaultValue);
    }

    return observeMyTeam(database, team.id).pipe(
        switchMap((myTeam) => {
            const rolesArray = [...user.roles.split(' ')];

            if (myTeam) {
                rolesArray.push(...myTeam.roles.split(' '));
            }

            return queryRolesByNames(database, rolesArray).observeWithColumns(['permissions']).pipe(
                switchMap((roles) => of$(hasPermission(roles, permission))),
            );
        }),
        distinctUntilChanged(),
    );
}

export function observePermissionForPost(database: Database, post: PostModel, user: UserModel | undefined, permission: string, defaultValue: boolean) {
    return observeChannel(database, post.channelId).pipe(
        switchMap((c) => observePermissionForChannel(database, c, user, permission, defaultValue)),
        distinctUntilChanged(),
    );
}

export function observeCanManageChannelMembers(database: Database, post: PostModel, user: UserModel) {
    return observeChannel(database, post.channelId).pipe(
        switchMap((c) => {
            if (!c || c.deleteAt !== 0 || isDMorGM(c) || c.name === General.DEFAULT_CHANNEL) {
                return of$(false);
            }

            const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
            return observePermissionForChannel(database, c, user, permission, true);
        }),
        distinctUntilChanged(),
    );
}
