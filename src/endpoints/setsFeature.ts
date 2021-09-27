import { CreateUpdateRiffBody, deleteRiff, getRiffs, postRiff, putRiff, Riff } from '../riff/riffClient';
import { searchSqon } from '../elasticSearch/searchSqon';
import { get } from 'lodash';

export type CreateUpdateSetBody = {
    projectId: string;
    type: string;
    sqon: JSON;
    path: string;
    sort: Sort[];
    tag: string;
};

export type Sort = {
    field: string;
    order: string;
};

export type Set = {
    id: string;
    tag: string;
    size: number;
};

export const getSets = async (accessToken: string, userId: string): Promise<Set[]> => {
    const userRiffs: Riff[] = await getRiffs(accessToken, userId);

    return userRiffs
        .filter(riff => get(riff, 'content.type', '') === 'set')
        .filter(riff => riff.alias)
        .map(riff => mapRiffToSet(riff));
};

export const createSet = async (
    sqon: JSON,
    sort: Sort[],
    projectId: string,
    type: string,
    path: string,
    tag: string,
    accessToken: string,
): Promise<Riff> => {
    const ids = await searchSqon(sqon, sort, projectId, type, path);

    const riffPayload = {
        alias: tag,
        sharedPublicly: false,
        content: { participantIds: ids, type: 'set', sqon },
    } as CreateUpdateRiffBody;

    return postRiff(accessToken, riffPayload);
};

export const updateSet = async (
    sqon: JSON,
    sort: Sort[],
    projectId: string,
    type: string,
    path: string,
    tag: string,
    accessToken: string,
    setId: string,
): Promise<Riff> => {
    const ids = await searchSqon(sqon, sort, projectId, type, path);

    const riffPayload = {
        alias: tag,
        sharedPublicly: false,
        content: { participantIds: ids, type: 'set', sqon },
    } as CreateUpdateRiffBody;

    return putRiff(accessToken, riffPayload, setId);
};

export const deleteSet = async (accessToken: string, setId: string): Promise<boolean> => deleteRiff(accessToken, setId);

const mapRiffToSet = (riff: Riff): Set =>
    ({ id: riff.id, tag: riff.alias, size: riff.content.participantIds.length } as Set);
