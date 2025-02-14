import { difference, dropRight, union } from 'lodash';

import { ArrangerProject } from '../../arrangerUtils';
import { maxSetContentSize } from '../../env';
import { addSqonToSetSqon, removeSqonToSetSqon } from '../../sqon/manipulateSqon';
import { resolveSetsInSqon } from '../../sqon/resolveSetInSqon';
import { searchSqon } from '../../sqon/searchSqon';
import { deleteUserSet, getUserSets, postUserSet, putUserSet, UserSet } from '../../userApi/userApiClient';
import { SetNotFoundError } from './setError';
import {
    CreateSetBody,
    CreateUpdateBody,
    RIFF_TYPE_SET,
    Set,
    UpdateSetContentBody,
    UpdateSetTagBody,
} from './setsTypes';

export const SubActionTypes = {
    RENAME_TAG: 'RENAME_TAG',
    ADD_IDS: 'ADD_IDS',
    REMOVE_IDS: 'REMOVE_IDS',
};

export const getUserSet = async (accessToken: string, setId: string): Promise<UserSet> => {
    const existingSetsFilterById: UserSet[] = (await getUserSets(accessToken)).filter(r => r.id === setId);
    if (existingSetsFilterById.length !== 1) {
        throw new SetNotFoundError('Set to update can not be found !');
    }

    return existingSetsFilterById[0];
};

export const getSets = async (accessToken: string): Promise<Set[]> => {
    const userContents = await getUserSets(accessToken);
    return userContents.map(set => mapUserResultToSet(set));
};

export const createSet = async (
    requestBody: CreateSetBody,
    accessToken: string,
    userId: string,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const { sqon, sort, projectId, type, idField, tag, is_invisible } = requestBody;
    const sqonAfterReplace = await resolveSetsInSqon(sqon, userId, accessToken);
    const ids = await searchSqon(sqonAfterReplace, projectId, type, sort, idField, getProject);

    const truncatedIds = truncateIds(ids);

    const payload: CreateUpdateBody = {
        alias: tag,
        sharedPublicly: false,
        content: { ids: truncatedIds, riffType: RIFF_TYPE_SET, setType: type, sqon, sort, idField },
        is_invisible: is_invisible ?? false,
    };

    if (!payload.alias || !payload.content.ids) {
        throw Error(`Set must have ${!payload.alias ? 'a name' : 'no set ids'}`);
    }
    const createResult = await postUserSet(accessToken, payload);
    return mapUserResultToSet(createResult);
};

export const updateSetTag = async (requestBody: UpdateSetTagBody, accessToken: string, setId: string): Promise<Set> => {
    const setToUpdate: UserSet = await getUserSet(accessToken, setId);

    const payload: CreateUpdateBody = {
        alias: requestBody.newTag,
        sharedPublicly: setToUpdate.sharedpublicly,
        content: setToUpdate.content,
    };

    const updateResult = await putUserSet(accessToken, payload, setId);
    return mapUserResultToSet(updateResult);
};

export const updateSetContent = async (
    requestBody: UpdateSetContentBody,
    accessToken: string,
    userId: string,
    setId: string,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const setToUpdate = await getUserSet(accessToken, setId);

    const { sqon, ids, setType } = setToUpdate.content;

    const sqonAfterReplace = await resolveSetsInSqon(requestBody.sqon, userId, accessToken);

    const newSqonIds = await searchSqon(
        sqonAfterReplace,
        requestBody.projectId,
        setToUpdate.content.setType,
        setToUpdate.content.sort,
        setToUpdate.content.idField,
        getProject,
    );

    if (setType !== setToUpdate.content.setType) {
        throw new Error('Cannot add/remove from a set not of the same type');
    }

    const existingSqonWithNewSqon =
        requestBody.subAction === SubActionTypes.ADD_IDS
            ? addSqonToSetSqon(sqon, requestBody.sqon)
            : removeSqonToSetSqon(sqon, requestBody.sqon);

    const existingIdsWithNewIds =
        requestBody.subAction === SubActionTypes.ADD_IDS ? union(ids, newSqonIds) : difference(ids, newSqonIds);
    const truncatedIds = truncateIds(existingIdsWithNewIds);

    const payload: CreateUpdateBody = {
        alias: setToUpdate.alias,
        sharedPublicly: setToUpdate.sharedpublicly,
        content: { ...setToUpdate.content, sqon: existingSqonWithNewSqon, ids: truncatedIds },
    };

    const updateResult = await putUserSet(accessToken, payload, setId);
    return mapUserResultToSet(updateResult);
};

export const deleteSet = async (accessToken: string, setId: string): Promise<string> =>
    await deleteUserSet(accessToken, setId);

const mapUserResultToSet = (output: UserSet): Set => ({
    id: output.id,
    tag: output.alias,
    size: output.content.ids.length,
    updated_date: output.updated_date,
    setType: output.content.setType,
    created_date: output.creation_date,
});

const truncateIds = (ids: string[]): string[] => {
    if (ids.length <= maxSetContentSize) {
        return ids;
    }
    return dropRight(ids, ids.length - maxSetContentSize);
};
