import SQS from 'aws-sdk/clients/sqs';
import { difference, dropRight, get, union } from 'lodash';

import { maxSetContentSize, sendUpdateToSqs } from '../../env';
import {
    CreateUpdateRiffBody,
    deleteRiff,
    getRiffs,
    postRiff,
    putRiff,
    Riff,
    RIFF_TYPE_SET,
} from '../../riff/riffClient';
import { addSqonToSetSqon, removeSqonToSetSqon } from '../../sqon/manipulateSqon';
import { resolveSetsInSqon } from '../../sqon/resolveSetInSqon';
import { ArrangerProject, searchSqon } from '../../sqon/searchSqon';
import {
    EventCreate,
    EventCreateValue,
    EventDelete,
    EventDeleteValues,
    EventUpdate,
    UpdateContentValue,
    UpdateTagValue,
} from '../../SQS/eventTypes';
import { sendSetInSQSQueue } from '../../SQS/sendEvent';
import { SetNotFoundError } from './setError';
import { CreateSetBody, Set, UpdateSetContentBody, UpdateSetTagBody } from './setsTypes';

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

export const getSets = async (accessToken: string, userId: string): Promise<Set[]> => {
    const userRiffs: Riff[] = await getRiffs(accessToken, userId);

    return userRiffs
        .filter(riff => get(riff, 'content.riffType', '') === RIFF_TYPE_SET)
        .filter(riff => riff.alias)
        .map(riff => mapRiffToSet(riff));
};

export const createSet = async (
    requestBody: CreateSetBody,
    accessToken: string,
    userId: string,
    sqs: SQS,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const { sqon, sort, projectId, type, idField, tag } = requestBody;
    const sqonAfterReplace = await resolveSetsInSqon(sqon, userId, accessToken);
    const ids = await searchSqon(sqonAfterReplace, projectId, type, sort, idField, getProject);
    const truncatedIds = truncateIds(ids);

    const riffPayload = {
        alias: tag,
        sharedPublicly: false,
        content: { ids: truncatedIds, riffType: RIFF_TYPE_SET, setType: type, sqon, sort, idField },
    } as CreateUpdateRiffBody;

    const createResult = await postRiff(accessToken, riffPayload);

    const setResult: Set = mapRiffToSet(createResult);
    if (sendUpdateToSqs && createResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.CREATE,
            values: {
                userId,
                setId: createResult.id,
                ids: truncatedIds,
                size: truncatedIds.length,
                sqon,
                path: idField,
                type,
                tag,
                createdAt: createResult.creationDate,
            } as EventCreateValue,
        } as EventCreate);
    }
    return setResult;
};

export const updateSetTag = async (
    requestBody: UpdateSetTagBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQS,
): Promise<Set> => {
    const existingSetsFilterById = (await getRiffs(accessToken, userId)).filter(r => r.id === setId);

    if (existingSetsFilterById.length !== 1) {
        throw new SetNotFoundError('Set to update can not be found !');
    }

    const setToUpdate: Riff = existingSetsFilterById[0];

    const riffPayload = {
        alias: requestBody.newTag,
        sharedPublicly: setToUpdate.sharedPublicly,
        content: setToUpdate.content,
    } as CreateUpdateRiffBody;

    const updateResult = await putRiff(accessToken, riffPayload, setId);

    const setResult: Set = mapRiffToSet(updateResult);

    if (sendUpdateToSqs && updateResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: { userId, setId, newTag: updateResult.alias } as UpdateTagValue,
        } as EventUpdate);
    }

    return setResult;
};

export const updateSetContent = async (
    requestBody: UpdateSetContentBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQS,
    getProject: (projectId: string) => ArrangerProject,
): Promise<Set> => {
    const existingSetsFilterById = (await getRiffs(accessToken, userId)).filter(r => r.id === setId);

    if (existingSetsFilterById.length !== 1) {
        throw new SetNotFoundError('Set to update can not be found !');
    }

    const setToUpdate: Riff = existingSetsFilterById[0];
    const { sqon, ids } = setToUpdate.content;

    const sqonAfterReplace = await resolveSetsInSqon(requestBody.sqon, userId, accessToken);
    const newSqonIds = await searchSqon(
        sqonAfterReplace,
        requestBody.projectId,
        setToUpdate.content.setType,
        setToUpdate.content.sort,
        setToUpdate.content.idField,
        getProject,
    );

    const existingSqonWithNewSqon =
        requestBody.subAction === SubActionTypes.ADD_IDS
            ? addSqonToSetSqon(sqon, requestBody.sqon)
            : removeSqonToSetSqon(sqon, requestBody.sqon);

    const existingIdsWithNewIds =
        requestBody.subAction === SubActionTypes.ADD_IDS ? union(ids, newSqonIds) : difference(ids, newSqonIds);
    const truncatedIds = truncateIds(existingIdsWithNewIds);

    const riffPayload = {
        alias: setToUpdate.alias,
        sharedPublicly: setToUpdate.sharedPublicly,
        content: { ...setToUpdate.content, sqon: existingSqonWithNewSqon, ids: truncatedIds },
    } as CreateUpdateRiffBody;

    const updateResult = await putRiff(accessToken, riffPayload, setId);

    const setResult: Set = mapRiffToSet(updateResult);

    if (sendUpdateToSqs && updateResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: {
                userId,
                setId,
                tag: updateResult.alias,
                ids: truncatedIds,
                createdAt: updateResult.creationDate,
            } as UpdateContentValue,
        } as EventUpdate);
    }
    return setResult;
};

export const deleteSet = async (accessToken: string, setId: string, userId: string, sqs: SQS): Promise<boolean> => {
    const deleteResult = await deleteRiff(accessToken, setId);

    if (sendUpdateToSqs) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.DELETE,
            values: { setIds: [setId], userId } as EventDeleteValues,
        } as EventDelete);
    }
    return deleteResult;
};

const mapRiffToSet = (riff: Riff): Set => ({ id: riff.id, tag: riff.alias, size: riff.content.ids.length } as Set);

const truncateIds = (ids: string[]): string[] => {
    if (ids.length <= maxSetContentSize) {
        return ids;
    }
    return dropRight(ids, ids.length - maxSetContentSize);
};
