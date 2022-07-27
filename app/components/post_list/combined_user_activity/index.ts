// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {queryPostsById} from '@queries/servers/post';
import {observePermissionForPost} from '@queries/servers/role';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser, queryUsersByIdsOrUsernames} from '@queries/servers/user';
import {generateCombinedPost, getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import CombinedUserActivity from './combined_user_activity';

import type {WithDatabaseArgs} from '@typings/database/database';

const withCombinedPosts = withObservables(['postId'], ({database, postId}: WithDatabaseArgs & {postId: string}) => {
    const currentUserId = observeCurrentUserId(database);
    const currentUser = currentUserId.pipe(
        switchMap((value) => observeUser(database, value)),
    );

    const postIds = getPostIdsForCombinedUserActivityPost(postId);

    // Columns observed: `props` is used by `usernamesById`. `message` is used by generateCombinedPost.
    const posts = queryPostsById(database, postIds).observeWithColumns(['props', 'message']);
    const post = posts.pipe(map((ps) => generateCombinedPost(postId, ps)));
    const canDelete = combineLatest([posts, currentUser]).pipe(
        switchMap(([ps, u]) => (ps.length ? observePermissionForPost(database, ps[0], u, Permissions.DELETE_OTHERS_POSTS, false) : of$(false))),
    );

    const usernamesById = post.pipe(
        switchMap(
            (p) => queryUsersByIdsOrUsernames(database, p.props.user_activity.allUserIds, p.props.user_activity.allUsernames).observeWithColumns(['username']).
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((users) => {
                        // eslint-disable-next-line max-nested-callbacks
                        return of$(users.reduce((acc: Record<string, string>, user) => {
                            acc[user.id] = user.username;
                            return acc;
                        }, {}));
                    }),
                ),
        ),
    );

    return {
        canDelete,
        currentUserId,
        post,
        usernamesById,
    };
});

export default React.memo(withDatabase(withCombinedPosts(CombinedUserActivity)));
