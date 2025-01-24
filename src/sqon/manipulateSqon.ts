import { SQON as v3SQON } from '@overture-stack/sqon-builder';

import { SetSqon } from '../endpoints/sets/setsTypes';

export const addSqonToSetSqon = (receivingSqon: SetSqon, donorSqon: SetSqon): SetSqon =>
    ({
        op: 'or',
        content: [receivingSqon, donorSqon],
    } as SetSqon);

export const removeSqonToSetSqon = (setSqon: SetSqon, sqonToRemove: SetSqon): SetSqon => {
    const negatedSqonToRemove = {
        op: 'not',
        content: [sqonToRemove],
    };
    return {
        op: 'and',
        content: [setSqon, negatedSqonToRemove],
    } as SetSqon;
};

const isString = (x: unknown): boolean => typeof x === 'string';

const renameFieldCore = (toV3: boolean) => (sqon: v3SQON | string) => {
    const s = (isString(sqon) ? sqon : JSON.stringify(sqon)) as string;
    const updated = toV3 ? s.replace(/"field":/g, '"fieldName":') : s.replace(/"fieldName":/g, '"field":');
    return JSON.parse(updated);
};

export const renameFieldNameToField = renameFieldCore(false);

export const renameFieldToFieldName = renameFieldCore(true);

export const sqonContainsSet = (s: string) => JSON.stringify(s).includes('"set_id:');
