import type { SetSqon } from '../endpoints/sets/setsTypes.js';
import type { Sqon } from './types.js';

export const addSqonToSetSqon = (receivingSqon: SetSqon, donorSqon: SetSqon): SetSqon =>
    ({
        op: 'or',
        content: [receivingSqon, donorSqon],
    }) as SetSqon;

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

export const sqonContainsSet = (s: Sqon) => JSON.stringify(s).includes('"set_id:');

// Taken as-is from "@overture-stack/sqon-builder": "^1.1.0" but zod Types were removed
const combine = (op, sqon, content, pivot) => {
    const output = { op, content: [] };
    if (sqon.op === op && sqon.pivot === pivot) {
        // provided sqon has same operation as requested:
        //   don't add wrapper, insert new content into existing sqon
        output.content = output.content.concat(sqon.content, content);
    } else {
        output.content = output.content.concat(sqon, content);
    }

    if (pivot !== undefined) {
        // dont automatically assign pivot: undefined to an operator, it will then appear in every output and that is not desired
        // optionally assigning pivot only if it has a value avoids this

        // @ts-expect-error -- combine() is generic over its return type; pivot
        // is added only when defined to avoid serializing `pivot: undefined`.
        output.pivot = pivot;
    }
    return output;
};

const asArray = input => (Array.isArray(input) ? input : [input]);

export const and = (x: Sqon, xs: Sqon | Sqon[]): Sqon => combine('and', x, xs, undefined);
export const or = (x: Sqon, xs: Sqon | Sqon[]): Sqon => combine('or', x, xs, undefined);

export const not = (x: Sqon, xs: Sqon | Sqon[]): Sqon =>
    combine(
        'and',
        x,
        {
            op: 'not',
            content: asArray(xs),
            pivot: undefined,
        },
        undefined,
    );
