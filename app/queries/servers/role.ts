// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Database as DatabaseConstants, General, Permissions} from '@constants';
import {isDMorGM} from '@utils/channel';
import {hasPermission} from '@utils/role';

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

export function observePermissionForChannel(channel: ChannelModel, user: UserModel, permission: string, defaultValue: boolean) {
    const myChannel = channel.membership.observe();
    const myTeam = channel.teamId ? channel.team.observe().pipe(switchMap((t) => (t ? t.myTeam.observe() : of$(undefined)))) : of$(undefined);

    return combineLatest([myChannel, myTeam]).pipe(switchMap(([mc, mt]) => {
        const rolesArray = [...user.roles.split(' ')];
        if (mc) {
            rolesArray.push(...mc.roles.split(' '));
        }
        if (mt) {
            rolesArray.push(...mt.roles.split(' '));
        }
        return queryRolesByNames(user.database, rolesArray).observe().pipe(
            switchMap((r) => of$(hasPermission(r, permission, defaultValue))),
        );
    }));
}

export function observePermissionForTeam(team: TeamModel, user: UserModel, permission: string, defaultValue: boolean) {
    return team.myTeam.observe().pipe(switchMap((myTeam) => {
        const rolesArray = [...user.roles.split(' ')];

        if (myTeam) {
            rolesArray.push(...myTeam.roles.split(' '));
        }

        return queryRolesByNames(user.database, rolesArray).observe().pipe(
            switchMap((roles) => of$(hasPermission(roles, permission, defaultValue))),
        );
    }));
}

export function observePermissionForPost(post: PostModel, user: UserModel, permission: string, defaultValue: boolean) {
    return post.channel.observe().pipe(switchMap((c) => (c ? observePermissionForChannel(c, user, permission, defaultValue) : of$(defaultValue))));
}

export function observeCanManageChannelMembers(post: PostModel, user: UserModel) {
    return post.channel.observe().pipe((switchMap((c) => {
        if (!c || c.deleteAt !== 0 || isDMorGM(c) || c.name === General.DEFAULT_CHANNEL) {
            return of$(false);
        }

        const permission = c.type === General.OPEN_CHANNEL ? Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS : Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS;
        return observePermissionForChannel(c, user, permission, true);
    })));
}
