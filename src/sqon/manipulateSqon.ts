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
