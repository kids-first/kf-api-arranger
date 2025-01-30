import { Dictionary, flattenDeep, get, isArray, zipObject } from 'lodash';

import { SetSqon } from '../endpoints/sets/setsTypes';
import { getSharedSet, getUserSets, UserSet } from '../userApi/userApiClient';
import { sqonContainsSet } from './manipulateSqon';
import { Sqon } from './types';

const getSetIdsFromSqon = (sqon: SetSqon, collection = []) =>
    (isArray(sqon.content)
        ? flattenDeep(
              sqon.content.reduce((acc, subSqon) => [...acc, ...getSetIdsFromSqon(subSqon, collection)], collection),
          )
        : isArray(sqon.content?.value)
        ? sqon.content?.value.filter(value => String(value).indexOf('set_id:') === 0)
        : [...(String(sqon.content?.value).indexOf?.('set_id:') === 0 ? [sqon.content.value] : [])]
    ).map(setId => setId.replace('set_id:', ''));

const injectIdsIntoSqon = (sqon: SetSqon, setIdsToValueMap: Dictionary<string[]>) => ({
    ...sqon,
    content: sqon.content.map(op => ({
        ...op,
        content: !isArray(op.content)
            ? {
                  ...op.content,
                  value: isArray(op.content.value)
                      ? flattenDeep(op.content.value.map(value => setIdsToValueMap[value] || op.content.value))
                      : setIdsToValueMap[op.content.value] || op.content.value,
              }
            : injectIdsIntoSqon(op, setIdsToValueMap).content,
    })),
});

export const resolveSetsInSqonWithMapper = async (
    sqon: SetSqon,
    userId: string,
    accessToken: string,
): Promise<{
    resolvedSqon: SetSqon;
    m?: Dictionary<string[]>;
}> => {
    const setIds: string[] = getSetIdsFromSqon(sqon || ({} as SetSqon));
    if (setIds.length) {
        const userSets: UserSet[] = await retrieveSetsFromUsers(accessToken, setIds);
        const ids = setIds.map(setId => get(userSets.filter(r => r.id === setId)[0], 'content.ids', []));
        const setIdsToValueMap: Dictionary<string[]> = zipObject(
            setIds.map(id => `set_id:${id}`),
            ids,
        );

        return {
            resolvedSqon: injectIdsIntoSqon(sqon, setIdsToValueMap),
            m: setIdsToValueMap,
        };
    }
    return {
        resolvedSqon: sqon,
        m: null,
    };
};

export const resolveSetsInAllSqonsWithMapper = async (
    sqons: Sqon[],
    userId: string,
    accessToken: string,
): Promise<{
    resolvedSqons: Sqon[];
    m?: Map<string, string[]>;
}> => {
    const resolvedSqons = [];
    let mSetItToIds = new Map();
    for (const s of sqons) {
        if (sqonContainsSet(s)) {
            const r = await resolveSetsInSqonWithMapper(s, null, accessToken);
            resolvedSqons.push(r.resolvedSqon);
            if (r.m) {
                mSetItToIds = new Map([...mSetItToIds, ...new Map(Object.entries(r.m))]);
            }
        } else {
            resolvedSqons.push(s);
        }
    }
    return {
        resolvedSqons: resolvedSqons,
        m: mSetItToIds,
    };
};

export const resolveSetsInSqon = async (sqon: SetSqon, userId: string, accessToken: string): Promise<SetSqon> =>
    (await resolveSetsInSqonWithMapper(sqon, userId, accessToken)).resolvedSqon;

export const retrieveSetsFromUsers = async (accessToken: string, setIds: string[]): Promise<UserSet[]> => {
    // Get all user sets
    const userSets = await getUserSets(accessToken);
    const userSetsIds = userSets.map(us => us.id);

    for (const setId of setIds) {
        // if set is a shared set, fetch it and add it to user sets
        if (!userSetsIds.includes(setId)) {
            const sharedSet = await getSharedSet(accessToken, setId);
            userSets.push(sharedSet);
            userSetsIds.push(sharedSet.id);
        }
    }

    return userSets;
};

const hasSameElements = (a, b) => a.length === b.length && [...new Set(a)].every(ax => b.includes(ax));

export const replaceIdsWithSetId = (sqon: Sqon, setIdsToValueMap: Map<string, string[]>): Sqon => ({
    ...sqon,
    content: sqon.content.map(x => {
        if (Array.isArray(x.content)) {
            return {
                ...x,
                content: replaceIdsWithSetId(x, setIdsToValueMap).content,
            };
        }

        const setId = Array.isArray(x.content.value)
            ? [...setIdsToValueMap].find(([, v]) => hasSameElements(v, x.content.value))?.[0]
            : null;
        return {
            ...x,
            content: {
                ...x.content,
                value: setId ? [setId] : x.content.value,
            },
        };
    }),
});
