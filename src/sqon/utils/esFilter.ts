// Low-level ES query wrappers — pure shape builders that wrap an inner ES
// query in `bool`/`nested`/etc. envelopes.

import { ES_BOOL, ES_MUST, ES_MUST_NOT, ES_NESTED, ES_PATH, ES_QUERY, ES_SHOULD } from '../constants.js';
import type { EsQuery } from '../types.js';

export function wrapBool(
    op: typeof ES_MUST | typeof ES_MUST_NOT | typeof ES_SHOULD,
    value: EsQuery | EsQuery[],
): EsQuery {
    return {
        [ES_BOOL]: {
            [op]: Array.isArray(value) ? value : [value],
        },
    };
}

export const wrapMust = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_MUST, value);
export const wrapMustNot = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_MUST_NOT, value);
export const wrapShould = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_SHOULD, value);

export function wrapNested(esFilter: EsQuery, path: string): EsQuery {
    return {
        [ES_NESTED]: {
            [ES_PATH]: path,
            // If the inner filter is already a bool, keep it as-is; otherwise
            // wrap in `must` so the nested query is always a bool shape.
            [ES_QUERY]: esFilter[ES_BOOL] ? esFilter : wrapMust(esFilter),
        },
    };
}

export function isNested(filter: EsQuery | null | undefined): boolean {
    return !!filter && Object.hasOwn(filter, ES_NESTED);
}

export function readPath(filter: EsQuery | null | undefined): string {
    return filter?.[ES_NESTED]?.[ES_PATH] ?? '';
}

// `mergePath(target, ['a', 'b', 'c'], data)` returns a new object with
// `target.a.b.c` replaced by `data` (cloning along the path). Used by
// collapseNestedFilters to push merged filters back into the right slot.
export function mergePath(target: EsQuery, path: ReadonlyArray<string>, data: unknown): EsQuery {
    if (path.length === 0) return data as EsQuery;
    const [head, ...rest] = path;
    return {
        ...target,
        [head]: rest.length ? mergePath(target?.[head] ?? {}, rest, data) : data,
    };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toEsRangeValue(value: unknown): unknown {
    // Only act on `yyyy-MM-dd`-shaped strings. Anything else (numbers, full
    // ISO-8601 with time, garbage) is returned as-is.
    if (typeof value === 'string' && value.length >= 10 && ISO_DATE_RE.test(value)) {
        const ms = Date.parse(value);
        if (!Number.isNaN(ms)) {
            return `${value} 00:00:00.000000`;
        }
    }
    return value;
}
