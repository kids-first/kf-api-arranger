import { SQSClient } from '@aws-sdk/client-sqs';
import { difference, dropRight, get, union } from 'lodash';

import { ArrangerProject } from '../../arrangerUtils';
import { maxSetContentSize, project, PROJECT_INCLUDE, sendUpdateToSqs } from '../../env';
import {
    CreateUpdateBody,
    deleteRiff,
    getRiffs,
    Output as RiffOutput,
    postRiff,
    putRiff,
    RIFF_TYPE_SET,
} from '../../riff/riffClient';
import { addSqonToSetSqon, removeSqonToSetSqon } from '../../sqon/manipulateSqon';
import { resolveSetsInSqon } from '../../sqon/resolveSetInSqon';
import { searchSqon } from '../../sqon/searchSqon';
import { sendSetInSQSQueue } from '../../SQS/sendEvent';
import {
    deleteUserContent,
    getUserContents,
    Output as UserSetOutput,
    postUserContent,
    putUserContent,
} from '../../userApi/userApiClient';
import { SetNotFoundError } from './setError';
import { CreateSetBody, Set, UpdateSetContentBody, UpdateSetTagBody } from './setsTypes';

const projectType = project;

export const SubActionTypes = {
    RENAME_TAG: 'RENAME_TAG',
    ADD_IDS: 'ADD_IDS',
    REMOVE_IDS: 'REMOVE_IDS',
};

const ActionTypes = {
    CREATE: 'CREATE',
    DELETE: 'DELETE',
    UPDATE: 'UPDATE',
};

export const getUserSet = async (accessToken: string, userId: string, setId: string): Promise<UserSetOutput> => {
    let existingSetsFilterById: UserSetOutput[];
    if (projectType === PROJECT_INCLUDE) {
        existingSetsFilterById = (await getUserContents(accessToken)).filter(r => r.id === setId);
    } else {
        existingSetsFilterById = (await getRiffs(accessToken, userId))
            .filter(r => r.id === setId)
            .map(s => mapRiffOutputToUserOutput(s));
    }

    if (existingSetsFilterById.length !== 1) {
        throw new SetNotFoundError('Set to update can not be found !');
    }

    return existingSetsFilterById[0];
};

export const getSets = async (accessToken: string, userId: string): Promise<Set[]> => {
    if (projectType === PROJECT_INCLUDE) {
        const userContents = await getUserContents(accessToken);

        return userContents.map(set => mapUserResultToSet(set));
    } else {
        const userContents = await getRiffs(accessToken, userId);
        return userContents
            .filter(riff => get(riff, 'content.riffType', '') === RIFF_TYPE_SET)
            .filter(riff => riff.alias)
            .map(riff => mapRiffResultToSet(riff));
    }
};

export const createSet = async (
    requestBody: CreateSetBody,
    accessToken: string,
    userId: string,
    sqs: SQSClient,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const { sqon, sort, projectId, type, idField, tag } = requestBody;
    const sqonAfterReplace = await resolveSetsInSqon(sqon, userId, accessToken);
    const ids = await searchSqon(sqonAfterReplace, projectId, type, sort, idField, getProject);

    const truncatedIds = truncateIds(ids);

    const payload: CreateUpdateBody = {
        alias: tag,
        sharedPublicly: false,
        content: { ids: truncatedIds, riffType: RIFF_TYPE_SET, setType: type, sqon, sort, idField },
    };

    let setResult: Set;
    if (projectType === PROJECT_INCLUDE) {
        if (!payload.alias || !payload.content.ids) {
            throw Error(`Set must have ${!payload.alias ? 'a name' : 'no set ids'}`);
        }
        const createResult = await postUserContent(accessToken, payload);
        setResult = mapUserResultToSet(createResult);
    } else {
        const createResult = await postRiff(accessToken, payload);
        setResult = mapRiffResultToSet(createResult);
    }

    if (sendUpdateToSqs && setResult.tag) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.CREATE,
            values: {
                userId,
                setId: setResult.id,
                ids: truncatedIds,
                size: truncatedIds.length,
                sqon,
                path: idField,
                type,
                tag,
                createdAt: setResult.created_date,
            },
        });
    }
    return setResult;
};

export const updateSetTag = async (
    requestBody: UpdateSetTagBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQSClient,
): Promise<Set> => {
    const setToUpdate: UserSetOutput = await getUserSet(accessToken, userId, setId);

    const payload: CreateUpdateBody = {
        alias: requestBody.newTag,
        sharedPublicly: setToUpdate.sharedpublicly,
        content: setToUpdate.content,
    };

    let setResult: Set;
    if (projectType === PROJECT_INCLUDE) {
        const updateResult = await putUserContent(accessToken, payload, setId);
        setResult = mapUserResultToSet(updateResult);
    } else {
        const updateResult = await putRiff(accessToken, payload, setId);
        setResult = mapRiffResultToSet(updateResult);
    }

    if (sendUpdateToSqs && setResult.tag) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: { userId, setId, newTag: setResult.tag },
        });
    }

    return setResult;
};

export const updateSetContent = async (
    requestBody: UpdateSetContentBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQSClient,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const setToUpdate = await getUserSet(accessToken, userId, setId);

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

    let setResult: Set;
    if (projectType === PROJECT_INCLUDE) {
        const updateResult = await putUserContent(accessToken, payload, setId);
        setResult = mapUserResultToSet(updateResult);
    } else {
        const updateResult = await putRiff(accessToken, payload, setId);
        setResult = mapRiffResultToSet(updateResult);
    }

    if (sendUpdateToSqs && setResult.tag) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: {
                userId,
                setId,
                tag: setResult.tag,
                ids: truncatedIds,
                createdAt: setResult.created_date,
            },
        });
    }
    return setResult;
};

export const deleteSet = async (
    accessToken: string,
    setId: string,
    userId: string,
    sqs: SQSClient,
): Promise<boolean> => {
    let deleteResult;

    if (projectType === PROJECT_INCLUDE) {
        deleteResult = await deleteUserContent(accessToken, setId);
    } else {
        deleteResult = await deleteRiff(accessToken, setId);
    }

    if (sendUpdateToSqs) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.DELETE,
            values: { setIds: [setId], userId },
        });
    }
    return deleteResult;
};

const mapUserResultToSet = (output: UserSetOutput): Set => ({
    id: output.id,
    tag: output.alias,
    size: output.content.ids.length,
    updated_date: output.updated_date,
    setType: output.content.setType,
    created_date: output.creation_date,
});

const mapRiffResultToSet = (output: RiffOutput): Set => ({
    id: output.id,
    tag: output.alias,
    size: output.content.ids.length,
    updated_date: output.updatedDate,
    setType: output.content.setType,
    created_date: output.creationDate,
});

export const mapRiffOutputToUserOutput = (output: RiffOutput): UserSetOutput => ({
    id: output.id,
    keycloak_id: output.uid,
    content: output.content,
    alias: output.alias,
    sharedpublicly: output.sharedPublicly,
    creation_date: output.creationDate,
    updated_date: output.updatedDate,
});

const truncateIds = (ids: string[]): string[] => {
    if (ids.length <= maxSetContentSize) {
        return ids;
    }
    return dropRight(ids, ids.length - maxSetContentSize);
};
