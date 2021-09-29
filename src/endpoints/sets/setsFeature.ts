import { difference, get, union } from 'lodash';

import {
    CreateUpdateRiffBody,
    deleteRiff,
    getRiffs,
    postRiff,
    putRiff,
    Riff,
    RIFF_TYPE_SET,
} from '../../riff/riffClient';
import { searchSqon } from '../../elasticSearch/searchSqon';
import { addSqonToSetSqon, removeSqonToSetSqon } from '../../elasticSearch/manipulateSqon';
import { CreateSetBody, Set, UpdateSetContentBody, UpdateSetTagBody } from './setsTypes';
import { sendSetInSQSQueue } from '../../SQS/sendEvent';
import SQS from 'aws-sdk/clients/sqs';
import {
    EventCreate,
    EventCreateValue,
    EventDelete,
    EventDeleteValues,
    EventUpdate,
    UpdateContentValue,
    UpdateTagValue,
} from '../../SQS/eventTypes';
import { SetNotFoundError } from './setError';

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
): Promise<Riff> => {
    const { sqon, sort, projectId, type, path, tag } = requestBody;
    const ids = await searchSqon(sqon, sort, projectId, type, path);

    const riffPayload = {
        alias: tag,
        sharedPublicly: false,
        content: { ids, riffType: RIFF_TYPE_SET, setType: type, sqon, sort, path },
    } as CreateUpdateRiffBody;

    const createResult = await postRiff(accessToken, riffPayload);

    if (createResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.CREATE,
            values: {
                userId,
                setId: createResult.id,
                ids,
                size: ids.length,
                sqon,
                path,
                type,
                tag,
                createdAt: createResult.creationDate,
            } as EventCreateValue,
        } as EventCreate);
    }
    return createResult;
};

export const updateSetTag = async (
    requestBody: UpdateSetTagBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQS,
): Promise<Riff> => {
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

    if (updateResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: { userId, setId, newTag: updateResult.alias } as UpdateTagValue,
        } as EventUpdate);
    }

    return updateResult;
};

export const updateSetContent = async (
    requestBody: UpdateSetContentBody,
    accessToken: string,
    userId: string,
    setId: string,
    sqs: SQS,
): Promise<Riff> => {
    const existingSetsFilterById = (await getRiffs(accessToken, userId)).filter(r => r.id === setId);

    if (existingSetsFilterById.length !== 1) {
        throw new SetNotFoundError('Set to update can not be found !');
    }

    const setToUpdate: Riff = existingSetsFilterById[0];
    const { sqon, ids } = setToUpdate.content;

    const newSqonIds = await searchSqon(
        requestBody.sqon,
        setToUpdate.content.sort,
        requestBody.projectId,
        setToUpdate.content.setType,
        setToUpdate.content.path,
    );

    const existingSqonWithNewSqon =
        requestBody.subAction === SubActionTypes.ADD_IDS
            ? addSqonToSetSqon(sqon, requestBody.sqon)
            : removeSqonToSetSqon(sqon, requestBody.sqon);

    const existingIdsWithNewIds =
        requestBody.subAction === SubActionTypes.ADD_IDS ? union(ids, newSqonIds) : difference(ids, newSqonIds);

    const riffPayload = {
        alias: setToUpdate.alias,
        sharedPublicly: setToUpdate.sharedPublicly,
        content: { ...setToUpdate.content, sqon: existingSqonWithNewSqon, ids: existingIdsWithNewIds },
    } as CreateUpdateRiffBody;

    const updateResult = await putRiff(accessToken, riffPayload, setId);

    if (updateResult.alias) {
        await sendSetInSQSQueue(sqs, {
            actionType: ActionTypes.UPDATE,
            subActionType: requestBody.subAction,
            values: {
                userId,
                setId,
                tag: updateResult.alias,
                ids: existingIdsWithNewIds,
                createdAt: updateResult.creationDate,
            } as UpdateContentValue,
        } as EventUpdate);
    }
    return updateResult;
};

export const deleteSet = async (accessToken: string, setId: string, userId: string, sqs: SQS): Promise<boolean> => {
    const deleteResult = await deleteRiff(accessToken, setId);

    await sendSetInSQSQueue(sqs, {
        actionType: ActionTypes.DELETE,
        values: { setIds: [setId], userId } as EventDeleteValues,
    } as EventDelete);
    return deleteResult;
};

const mapRiffToSet = (riff: Riff): Set => ({ id: riff.id, tag: riff.alias, size: riff.content.ids.length } as Set);
