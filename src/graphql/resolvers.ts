// Resolver factory for the multi-entity GraphQL schema. One createResolvers
// call wires the resolvers for all N entities; each entity's resolvers close
// over its own esIndex + nestedFields + extendedEntries + columnsState.
// ServerContext holds the EsClient only.
//
// Entity-level resolvers:
//   - hits(filters, sort, first, offset, searchAfter): full ES search.
//   - aggregations(filters, ...): ES search with aggs body, response is
//     flattened to dot-paths then GraphQL-keyed (`__` for `.`).
//   - extended(fields?): returns the per-entity extended list (filterable).
//   - columnsState: returns the precomputed (or null) columnsState.
//
// Nested fields are shaped into Connection payloads at the source level via
// resolveNested, so sub-Connection queries traverse the right structure.

import type { IResolvers } from '@graphql-tools/utils';
import type { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';
import type { EsClient } from '../es/client.js';
import buildAggregations from '../sqon/buildAggregations/index.js';
import buildQuery from '../sqon/buildQuery/index.js';
import { flattenAggregations } from '../sqon/flattenAggregations.js';
import type { EntityModule } from './schema/index.js';

export type ServerContext = {
    es: EsClient;
};

type SortInput = {
    field?: string;
    order?: string;
    missing?: string;
};

type HitsArgs = {
    filters?: unknown;
    first?: number;
    offset?: number;
    sort?: SortInput[];
    searchAfter?: unknown[];
};

// For each sort entry: compute the deepest nested-field prefix on the sort
// field so ES applies nested-sort semantics; supply a `missing` default
// based on order direction if not provided.
function buildEsSort(sortInputs: SortInput[], nestedFields: string[]): unknown[] {
    return sortInputs.map(({ field, order, missing }) => {
        const fld = field ?? '';
        const nestedPath = nestedFields
            .filter(nf => fld === nf || fld.startsWith(`${nf}.`))
            .reduce((deepest, p) => (deepest.length > p.length ? deepest : p), '');
        return {
            [fld]: {
                missing: missing ? (missing === 'first' ? '_first' : '_last') : order === 'asc' ? '_first' : '_last',
                order,
                ...(nestedPath.length ? { nested: { path: nestedPath } } : {}),
            },
        };
    });
}

type AggsArgs = {
    filters?: unknown;
    include_missing?: boolean;
    aggregations_filter_themselves?: boolean;
};

type ExtendedArgs = {
    fields?: string[];
};

// normalizeFilters throws on a SQON missing `op`. Coerce empty/missing SQONs
// to undefined at the boundary so the normalizer's falsy short-circuit
// handles them cleanly instead of hitting the throw.
function normalizeSqonInput(filters: unknown): unknown {
    if (filters == null) return undefined;
    if (typeof filters === 'object' && Object.keys(filters as object).length === 0) {
        return undefined;
    }
    return filters;
}

// Walks an ES `_source` object and, for any field whose full dotted path is
// in `nestedFields`, replaces its value with the Connection-shaped
// `{ hits: { edges: [{ node }], total } }` payload that Apollo's default
// field resolvers can pick across for sub-Connection queries
// (`contacts { hits { edges { node { ... } } } }`). Non-nested values pass
// through (objects recurse to find nested descendants; scalars unchanged).
function resolveNested(value: unknown, nestedFields: string[], parent = ''): unknown {
    if (value == null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value.map(item => resolveNested(item, nestedFields, parent));
    }
    const out: Record<string, unknown> = {};
    for (const [field, child] of Object.entries(value as Record<string, unknown>)) {
        const fullPath = parent ? `${parent}.${field}` : field;
        if (nestedFields.includes(fullPath)) {
            const arr = Array.isArray(child) ? child : child == null ? [] : [child];
            out[field] = {
                hits: {
                    edges: arr.map(item => ({
                        node: {
                            ...(resolveNested(item, nestedFields, fullPath) as Record<string, unknown>),
                        },
                    })),
                    total: arr.length,
                },
            };
        } else {
            out[field] = resolveNested(child, nestedFields, fullPath);
        }
    }
    return out;
}

export function createResolvers(entities: EntityModule[]): IResolvers<unknown, ServerContext> {
    const root: Record<string, () => unknown> = {};
    const result: IResolvers<unknown, ServerContext> = { Root: root };

    for (const entity of entities) {
        const { entityName, esIndex, nestedFields, extendedEntries, columnsState } = entity;
        root[entityName] = () => ({});
        result[entityName] = {
            extended(_parent: unknown, { fields }: ExtendedArgs) {
                return fields ? extendedEntries.filter(e => fields.includes(e.field)) : extendedEntries;
            },
            columnsState() {
                return columnsState;
            },
            async hits(_parent: unknown, args: HitsArgs, ctx: ServerContext) {
                const sqon = normalizeSqonInput(args.filters);
                const built = buildQuery({ nestedFields, filters: sqon });
                const query = Object.keys(built).length > 0 ? built : { match_all: {} };
                const esSort = args.sort?.length ? buildEsSort(args.sort, nestedFields) : undefined;
                const res = await ctx.es.search<Record<string, unknown>>({
                    index: esIndex,
                    size: args.first ?? 10,
                    from: args.offset,
                    query,
                    sort: esSort,
                    // ES rejects `search_after: null` — omit the field
                    // entirely when the caller didn't supply one.
                    ...(args.searchAfter ? { search_after: args.searchAfter as unknown[] } : {}),
                    track_total_hits: true,
                });
                return {
                    total: res.hits.total.value,
                    edges: res.hits.hits.map(h => ({
                        searchAfter: h.sort,
                        node: {
                            ...(resolveNested(h._source, nestedFields) as Record<string, unknown>),
                            id: h._id,
                            score: null,
                        },
                    })),
                };
            },
            async aggregations(_parent: unknown, args: AggsArgs, ctx: ServerContext, info: GraphQLResolveInfo) {
                // `processArguments: true` is required by our sub-aggregation
                // builders (top_hits / filter_by_term read `__arguments[0]`
                // off each requested field).
                const requested = graphqlFields(info, {}, { processArguments: true });
                const sqon = normalizeSqonInput(args.filters);
                const built = buildQuery({ nestedFields, filters: sqon });
                const query = Object.keys(built).length > 0 ? built : { match_all: {} };
                const aggregations = buildAggregations({
                    sqon,
                    graphqlFields: requested,
                    nestedFields,
                    aggregationsFilterThemselves: args.aggregations_filter_themselves,
                    query,
                });
                const res = await ctx.es.search({
                    index: esIndex,
                    size: 0,
                    query,
                    aggregations,
                });
                const flat = flattenAggregations({
                    aggregations: res.aggregations ?? {},
                    includeMissing: args.include_missing,
                });
                // flattenAggregations emits dot-keyed nested paths
                // (`contacts.institution`); GraphQL field names use double
                // underscores. Convert at the resolver boundary so the
                // default field resolver picks up the right key.
                return Object.fromEntries(Object.entries(flat).map(([k, v]) => [k.replace(/\./g, '__'), v]));
            },
        };
    }

    return result;
}
