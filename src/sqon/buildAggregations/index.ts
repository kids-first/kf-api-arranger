// Top-level aggregation builder. Composes per-field aggs from
// createFieldAggregation, wraps nested fields, applies the global+filtered
// envelope when an active query touches a non-aggregated field, and post-
// processes through injectNestedFiltersToAggs.
//
// Inputs:
//   - sqon: the SQON itself (used to find shared-parent filters for nested
//     aggregation injection).
//   - graphqlFields: output of graphql-fields for the aggregations selection.
//     Keys may use `__` as a stand-in for `.` in field names.
//   - nestedFields: paths that are ES `nested` fields. Used to wrap aggs in
//     `nested` envelopes and to locate shared-parent filters.
//   - query: the ES query produced by buildQuery for the same SQON. Used
//     to compute the per-agg "all values except mine" companion filter.
//   - aggregationsFilterThemselves: when false (default), each agg has its
//     own field stripped from the active query before being applied — so a
//     terms agg on `tag` isn't pre-filtered by a `tag IN [...]` clause that
//     drives the page.

import { opSwitch } from '../buildQuery/index.js';
import normalizeFilters, { type Filter, type LeafContent } from '../buildQuery/normalizeFilters.js';
import {
    AGGS_WRAPPER_FILTERED,
    AGGS_WRAPPER_GLOBAL,
    AGGS_WRAPPER_NESTED,
    ES_BOOL,
    ES_NESTED,
    ES_QUERY,
} from '../constants.js';
import type { EsAggs, EsQuery } from '../types.js';
import createFieldAggregation from './createFieldAggregation.js';
import getNestedSqonFilters from './getNestedSqonFilters.js';
import injectNestedFiltersToAggs from './injectNestedFiltersToAggs.js';

function createGlobalAggregation(args: { field: string; aggregation: EsAggs }): EsAggs {
    return {
        [`${args.field}:${AGGS_WRAPPER_GLOBAL}`]: { global: {}, aggs: args.aggregation },
    };
}

function createFilteredAggregation(args: { field: string; filter: EsQuery | null; aggregation: EsAggs }): EsAggs {
    return Object.keys(args.filter ?? {}).length > 0
        ? { [`${args.field}:${AGGS_WRAPPER_FILTERED}`]: { filter: args.filter, aggs: args.aggregation } }
        : args.aggregation;
}

// Strip every clause from `query` that targets `field`. Returns null if
// stripping leaves nothing (the field was the only thing the query touched).
// Otherwise returns the cleaned query.
function removeFieldFromQuery(args: { field: string; query: EsQuery | null | undefined }): EsQuery | null {
    const { field, query } = args;
    if (query == null) return null;

    const nested = query[ES_NESTED];
    const nestedQuery = nested?.[ES_QUERY];
    const bool = query[ES_BOOL];

    const targetsThisField =
        ['terms', 'range'].some(k => query[k]?.[field] !== undefined) || query.exists?.field === field;
    if (targetsThisField) return null;

    if (nestedQuery) {
        const cleaned = removeFieldFromQuery({ field, query: nestedQuery });
        return cleaned ? { ...query, [ES_NESTED]: { ...nested, [ES_QUERY]: cleaned } } : null;
    }

    if (bool) {
        const filtered: Record<string, any[]> = {};
        for (const [type, values] of Object.entries(bool) as Array<[string, any[]]>) {
            const kept = values
                .map(v => removeFieldFromQuery({ field, query: v }))
                .filter((v): v is EsQuery => Boolean(v));
            if (kept.length > 0) filtered[type] = kept;
        }
        return Object.keys(filtered).length > 0 ? { [ES_BOOL]: filtered } : null;
    }

    return query;
}

function getNestedPathsInField(args: { field: string; nestedFields: string[] }): string[] {
    return args.field
        .split('.')
        .map((_s, i, arr) => arr.slice(0, i + 1).join('.'))
        .filter(p => args.nestedFields.includes(p));
}

// Cheap deep-equal sufficient for ES query trees (JSON-serializable shapes
// produced by buildQuery). Replaces lodash isEqual.
function shallowJsonEq(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

function wrapWithFilters(args: {
    field: string;
    query: EsQuery | null | undefined;
    aggregationsFilterThemselves: boolean | undefined;
    aggregation: EsAggs;
}): EsAggs {
    if (!args.aggregationsFilterThemselves) {
        const cleanedQuery = removeFieldFromQuery({ field: args.field, query: args.query });
        if (!shallowJsonEq(cleanedQuery ?? {}, args.query ?? {})) {
            return createGlobalAggregation({
                field: args.field,
                aggregation: createFilteredAggregation({
                    field: args.field,
                    filter: cleanedQuery,
                    aggregation: args.aggregation,
                }),
            });
        }
    }
    return args.aggregation;
}

export default function buildAggregations(args: {
    aggregationsFilterThemselves?: boolean;
    graphqlFields: Record<string, any>;
    nestedFields?: string[];
    query?: EsQuery;
    sqon?: unknown;
}): EsAggs {
    const { aggregationsFilterThemselves, graphqlFields, query, sqon } = args;
    const nestedFields = args.nestedFields ?? [];

    const normalizedSqon = normalizeFilters(sqon as Filter | null | undefined);
    const nestedSqonFilters = getNestedSqonFilters({ sqon: normalizedSqon, nestedFields });
    // Hoisted once: only the root content array is consulted per agg field.
    const rootContent: Filter[] = Array.isArray(normalizedSqon?.content) ? (normalizedSqon!.content as Filter[]) : [];

    const aggs: EsAggs = {};
    for (const [fieldKey, graphqlField] of Object.entries(graphqlFields)) {
        // graphql-fields keys may contain `__` where the schema name has `.`.
        const field = fieldKey.replace(/__/g, '.');
        const nestedPaths = getNestedPathsInField({ field, nestedFields });

        // CAUTION: array-to-string coercion. We pass the nestedPaths array
        // straight into `.startsWith()`, which stringifies to a comma-joined
        // form. In effect the prefix check only matches when nestedPaths has
        // 0 or 1 elements — which is the realistic case, since a SQON leaf
        // sits under exactly one nested envelope.
        const nestedPathsAsString = String(nestedPaths);
        const contentsFiltered = rootContent.filter(c => {
            const f = (c.content as LeafContent | undefined)?.field;
            if (!f) return false;
            return aggregationsFilterThemselves
                ? f.startsWith(nestedPathsAsString)
                : f.startsWith(nestedPathsAsString) && f !== field;
        });
        const termFilters = contentsFiltered.map(filter => opSwitch({ nestedFields: [], filter }));

        const fieldAggregation = createFieldAggregation({
            field,
            graphqlField,
            isNested: nestedPaths.length,
            termFilters,
        });

        // Wrap from deepest path inward so the outermost nested wrapper is
        // the shallowest path. `nestedPaths` is shallow-first → reverse().
        const aggregation = [...nestedPaths].reverse().reduce<EsAggs>(
            (acc, path) => ({
                [`${field}:${AGGS_WRAPPER_NESTED}`]: { nested: { path }, aggs: acc },
            }),
            fieldAggregation,
        );

        Object.assign(aggs, wrapWithFilters({ query, field, aggregation, aggregationsFilterThemselves }));
    }

    return injectNestedFiltersToAggs({ aggs, nestedSqonFilters, aggregationsFilterThemselves });
}
