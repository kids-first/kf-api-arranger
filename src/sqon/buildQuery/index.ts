// SQON → ES query dispatcher.
//
// `buildQuery({ nestedFields, filters })` returns an ES query body. Empty
// filters returns {}. Otherwise the SQON is normalized (./normalizeFilters)
// and dispatched through opSwitch.
//
// Note: resolveSetInSqon already replaces set_id values with literal ids
// before any SQON reaches here, so opSwitch's set-id branch is dead in our
// pipeline and is omitted. If a set_id ever does slip through it routes to
// getTermFilter and yields 0 hits, which the diff-real harness will catch.

import {
    ALL_OP,
    AND_OP,
    BETWEEN_OP,
    ES_BOOL,
    ES_MUST,
    ES_MUST_NOT,
    ES_NESTED,
    ES_QUERY,
    ES_WILDCARD,
    FILTER_OP,
    GT_OP,
    GTE_OP,
    IN_OP,
    LT_OP,
    LTE_OP,
    MISSING,
    NOT_IN_OP,
    NOT_OP,
    OR_OP,
    REGEX,
    SOME_NOT_IN_OP,
} from '../constants.js';
import type { EsQuery } from '../types.js';
import { isNested, mergePath, readPath, toEsRangeValue, wrapMust, wrapMustNot, wrapNested, wrapShould } from '../utils/esFilter.js';
import normalizeFilters, { type Filter, type LeafContent } from './normalizeFilters.js';

type OpArgs = { nestedFields: string[]; filter: Filter };

const GROUP_OPS = new Set<string>([OR_OP, AND_OP, NOT_OP]);
const IN_LIKE_OPS = new Set<string>([IN_OP, NOT_IN_OP, SOME_NOT_IN_OP]);
const RANGE_OPS = new Set<string>([GT_OP, GTE_OP, LT_OP, LTE_OP]);
const UPPER_BOUND_OPS = new Set<string>([GT_OP, GTE_OP]);

function wrapFilter({
    esFilter,
    nestedFields,
    filter,
    isNot,
}: {
    esFilter: EsQuery;
    nestedFields: string[];
    filter: Filter;
    isNot?: boolean;
}): EsQuery {
    const field = (filter.content as LeafContent).field ?? '';
    // Nested-field prefixes of `field`, deepest first. The reduce below
    // walks deepest → shallowest so the outermost wrapper ends up shallowest.
    const nestedPaths = nestedFields
        .filter(nf => field.startsWith(nf + '.'))
        .sort((a, b) => b.length - a.length);
    return nestedPaths.reduce<EsQuery>(
        (acc, path) => wrapNested(acc, path),
        isNot ? wrapMustNot(esFilter) : esFilter,
    );
}

function getRegexFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const { op } = filter;
    const content = filter.content as LeafContent;
    const value = (content.value as unknown[])[0] as string;
    const esFilter = wrapFilter({
        filter,
        nestedFields,
        esFilter: { regexp: { [content.field!]: value.replace('*', '.*') } },
        isNot: NOT_IN_OP === op,
    });
    return op === SOME_NOT_IN_OP ? wrapMustNot(esFilter) : esFilter;
}

function getTermFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const { op } = filter;
    const content = filter.content as LeafContent;
    const value = content.value as unknown[];
    const esFilter = wrapFilter({
        filter,
        nestedFields,
        esFilter: { terms: { [content.field!]: value.map(item => item || ''), boost: 0 } },
        isNot: NOT_IN_OP === op,
    });
    return op === SOME_NOT_IN_OP ? wrapMustNot(esFilter) : esFilter;
}

function getFuzzyFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const content = filter.content as LeafContent;
    const { value } = content;
    const fields = content.fields ?? [];

    // Group queries by deepest matching nested path. Sorted longest-first so
    // `a.b.c` beats `a.b` when both are nested fields.
    const sortedNested = [...nestedFields].sort((a, b) => b.length - a.length);
    const nestedMap: Record<string, string[]> = {};
    for (const field of fields) {
        const group = sortedNested.find(y => field.includes(y)) ?? '';
        (nestedMap[group] ??= []).push(field);
    }

    // One wildcard multi-match per nested group, OR'd together.
    return wrapShould(
        Object.values(nestedMap).map(groupFields =>
            wrapFilter({
                filter: { ...filter, content: { ...content, field: groupFields[0] } } as Filter,
                nestedFields,
                esFilter: wrapShould(
                    groupFields.map(field => ({
                        [ES_WILDCARD]: { [field]: { value: `${value}` } },
                    })),
                ),
            }),
        ),
    );
}

function getMissingFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const { field } = filter.content as LeafContent;
    return wrapFilter({
        esFilter: { exists: { field, boost: 0 } },
        nestedFields,
        filter,
        isNot: true,
    });
}

// Type-preserving min/max — `Math.min`/`Math.max` would coerce strings to
// numbers, but the FE sometimes sends numeric-string range bounds (e.g.
// `value: ['20']`) and ES accepts both forms.
const maxOf = <T>(arr: T[]): T => arr.reduce((a, b) => (a > b ? a : b));
const minOf = <T>(arr: T[]): T => arr.reduce((a, b) => (a < b ? a : b));

function getRangeFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const { op } = filter;
    const content = filter.content as LeafContent;
    const value = content.value as unknown[];
    const bound = UPPER_BOUND_OPS.has(op) ? maxOf(value) : minOf(value);
    return wrapFilter({
        filter,
        nestedFields,
        esFilter: {
            range: { [content.field!]: { boost: 0, [op]: toEsRangeValue(bound) } },
        },
    });
}

function getBetweenFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const content = filter.content as LeafContent;
    const value = content.value as unknown[];
    return wrapFilter({
        filter,
        nestedFields,
        esFilter: {
            range: {
                [content.field!]: {
                    boost: 0,
                    [GTE_OP]: minOf(value),
                    [LTE_OP]: maxOf(value),
                },
            },
        },
    });
}

// When two sibling nested-filters target the same path, merge their inner
// bool clauses into one nested envelope (rather than emit two separate
// nested wrappers on the same path).
function collapseNestedFilters({ esFilter, bools }: { esFilter: EsQuery; bools: EsQuery[] }): EsQuery[] {
    const filterIsNested = isNested(esFilter);
    const basePath = [...(filterIsNested ? [ES_NESTED, ES_QUERY] : []), ES_BOOL];
    const candidatePaths = [ES_MUST, ES_MUST_NOT].map(p => [...basePath, p]);
    const path = candidatePaths.find(p => readDeep(esFilter, p) !== undefined);

    const found =
        path &&
        bools.find(bool => (filterIsNested ? readPath(bool) === readPath(esFilter) : readDeep(bool, path) !== undefined));

    return [
        ...bools.filter(b => b !== found),
        found
            ? mergePath(
                  found,
                  path!,
                  filterIsNested
                      ? collapseNestedFilters({
                            esFilter: readDeep(esFilter, path!)[0],
                            bools: readDeep(found, path!) ?? [],
                        })
                      : [...(readDeep(found, path!) ?? []), ...(readDeep(esFilter, path!) ?? [])],
              )
            : esFilter,
    ];
}

function readDeep(obj: any, p: ReadonlyArray<string>): any {
    let cur = obj;
    for (const k of p) {
        if (cur == null) return undefined;
        cur = cur[k];
    }
    return cur;
}

const wrappers: Record<string, (v: EsQuery | EsQuery[]) => EsQuery> = {
    [AND_OP]: wrapMust,
    [OR_OP]: wrapShould,
    [NOT_OP]: wrapMustNot,
};

function getGroupFilter({ nestedFields, filter }: OpArgs): EsQuery {
    const { content, op, pivot } = filter;
    const applyBooleanWrapper = wrappers[op];
    const esFilters = (content as Filter[]).map(f => opSwitch({ nestedFields, filter: f }));
    const isNestedGroup = !!esFilters[0]?.nested;
    if (isNestedGroup && esFilters.map(f => f.nested?.path).includes(pivot)) {
        const flattened = esFilters.reduce<EsQuery[]>(
            (bools, esFilter) =>
                op === AND_OP || op === NOT_OP
                    ? collapseNestedFilters({ esFilter, bools })
                    : [...bools, esFilter],
            [],
        );
        return applyBooleanWrapper(flattened);
    }
    return applyBooleanWrapper(esFilters);
}

export function opSwitch({ nestedFields, filter }: OpArgs): EsQuery {
    const { op, pivot } = filter;

    if (GROUP_OPS.has(op)) {
        return getGroupFilter({ nestedFields, filter });
    }

    if (IN_LIKE_OPS.has(op)) {
        const value = (filter.content as LeafContent).value as unknown[] | undefined;
        const head = `${value?.[0]}`;
        if (head.includes(REGEX)) return getRegexFilter({ nestedFields, filter });
        if (head.includes(MISSING)) return getMissingFilter({ nestedFields, filter });
        return getTermFilter({ nestedFields, filter });
    }

    if (op === ALL_OP) {
        const content = filter.content as LeafContent;
        return getGroupFilter({
            nestedFields,
            filter: {
                op: AND_OP,
                pivot: pivot || '.',
                content: (content.value as unknown[]).map(v => ({
                    op: IN_OP,
                    content: { field: content.field, value: [v] },
                })) as Filter[],
            },
        });
    }

    if (RANGE_OPS.has(op)) return getRangeFilter({ nestedFields, filter });
    if (op === BETWEEN_OP) return getBetweenFilter({ nestedFields, filter });
    if (op === FILTER_OP) return getFuzzyFilter({ nestedFields, filter });
    throw new Error('unknown op');
}

export default function buildQuery(args: { nestedFields?: string[]; filters: unknown }): EsQuery {
    const nestedFields = args.nestedFields ?? [];
    const rawFilters = args.filters;
    if (!rawFilters || typeof rawFilters !== 'object' || Object.keys(rawFilters).length === 0) {
        return {};
    }
    return opSwitch({
        nestedFields,
        filter: normalizeFilters(rawFilters as Filter) as Filter,
    });
}
