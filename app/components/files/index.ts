// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$, from as from$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {observeConfigBooleanValue, observeLicense} from '@queries/servers/system';
import {fileExists} from '@utils/file';

import Files from './files';

import type {WithDatabaseArgs} from '@typings/database/database';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';

type EnhanceProps = WithDatabaseArgs & {
    post: PostModel;
}

const filesLocalPathValidation = async (files: FileModel[], authorId: string) => {
    const filesInfo: FileInfo[] = [];
    for await (const f of files) {
        const info = f.toFileInfo(authorId);
        if (info.localPath) {
            const exists = await fileExists(info.localPath);
            if (!exists) {
                info.localPath = '';
            }
        }
        filesInfo.push(info);
    }

    return filesInfo;
};

const enhance = withObservables(['post'], ({database, post}: EnhanceProps) => {
    const enableMobileFileDownload = observeConfigBooleanValue(database, 'EnableMobileFileDownload');
    const publicLinkEnabled = observeConfigBooleanValue(database, 'EnablePublicLink');

    const complianceDisabled = observeLicense(database).pipe(
        switchMap((lcs) => of$(lcs?.IsLicensed === 'false' || lcs?.Compliance === 'false')),
    );

    const canDownloadFiles = combineLatest([enableMobileFileDownload, complianceDisabled]).pipe(
        map(([download, compliance]) => compliance || download),
    );

    const filesInfo = post.files.observeWithColumns(['local_path']).pipe(
        switchMap((fs) => from$(filesLocalPathValidation(fs, post.userId))),
    );

    return {
        canDownloadFiles,
        postId: of$(post.id),
        publicLinkEnabled,
        filesInfo,
    };
});

export default withDatabase(enhance(Files));
