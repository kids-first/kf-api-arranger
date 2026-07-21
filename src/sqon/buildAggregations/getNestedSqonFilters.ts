// Walk a normalized SQON tree, collecting filters whose field path sits
// BELOW some nested parent path that differs from the surrounding pivot.
// Those filters need to be re-applied at aggregation time (downstream
// injectNestedFiltersToAggs), otherwise a query like IN(files.fhir_id, [...])
// would aggregate against the unfiltered nested sub-document.
//
// Returns Record<parentPath, leafFilter[]>.

import normalizeFilters from '../buildQuery/normalizeFilters.js';
import { AND_OP, NOT_OP, OR_OP } from '../constants.js';
import type { Sqon } from '../types.js';

const GROUP_OPS: ReadonlySet<string> = new Set([AND_OP, OR_OP, NOT_OP]);

function walk(args: {
    sqon: Sqon;
    nestedFields: string[];
    accumulator: Record<string, Sqon[]>;
    parentPivot: string;
}): Record<string, Sqon[]> {
    const { sqon, nestedFields, accumulator, parentPivot } = args;
    const { op } = sqon;

    if (GROUP_OPS.has(op)) {
        const { content = [], pivot } = sqon;
        for (const c of content as Sqon[]) {
            walk({ sqon: c, nestedFields, accumulator, parentPivot: pivot });
        }
        return accumulator;
    }

    const { field: sqonField, fields: sqonFields } = sqon.content;
    const fields: string[] = sqonFields ?? [sqonField];
    for (const field of fields) {
        const lastDot = field?.lastIndexOf('.') ?? -1;
        if (lastDot <= 0) continue;
        const parentPath = field.slice(0, lastDot);
        if (nestedFields.includes(parentPath) && parentPivot !== parentPath) {
            // accumulator[k].push(sqon) — preferred over `[...accumulator[k], sqon]`
            // which would be O(N²) when many sibling filters share a parent path.
            accumulator[parentPath] ??= [];
            accumulator[parentPath].push(sqon);
        }
    }
    return accumulator;
}

export default function getNestedSqonFilters(args: {
    sqon: Sqon | null;
    nestedFields: string[];
}): Record<string, Sqon[]> {
    if (!args.sqon) return {};
    const normalized = normalizeFilters(args.sqon);
    return walk({
        sqon: normalized,
        nestedFields: args.nestedFields,
        accumulator: {},
        parentPivot: '.',
    });
}
