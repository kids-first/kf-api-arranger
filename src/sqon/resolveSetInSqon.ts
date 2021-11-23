import { Dictionary, flattenDeep, get, isArray, zipObject } from 'lodash';

import { SetSqon } from '../endpoints/sets/setsTypes';
import { getRiffs } from '../riff/riffClient';

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

export const resolveSetsInSqon = async (sqon: SetSqon, userId: string, accessToken: string): Promise<SetSqon> => {
    const setIds: string[] = getSetIdsFromSqon(sqon || ({} as SetSqon));
    if (setIds.length) {
        const userRiffs = await getRiffs(accessToken, userId);
        const ids = setIds.map(setId => get(userRiffs.filter(r => r.id === setId)[0], 'content.ids', []));
        const setIdsToValueMap: Dictionary<string[]> = zipObject(
            setIds.map(id => `set_id:${id}`),
            ids,
        );
        return injectIdsIntoSqon(sqon, setIdsToValueMap);
    } else {
        return sqon;
    }
};
