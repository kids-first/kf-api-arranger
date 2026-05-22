// Resolver factory.
// Slice S: Root.<entity> + <entity>.hits.
// Slice T (added 2026-05-21): <entity>.aggregations via
// @arranger/middleware.buildAggregations + flattenAggregations.
// Slice U (added 2026-05-22): <entity>.extended + <entity>.columnsState,
// both read from the per-entity config loaded once at startup.
// Slice V (added 2026-05-22): nested fields pre-shaped into Connection
// payload via resolveNested.
// Slice X (multi-entity, 2026-05-22): one createResolvers call handles all
// N entities; each entity's resolvers close over its own esIndex +
// nestedFields + extendedEntries + columnsState. ServerContext is just { es }.

import { buildAggregations, buildQuery, flattenAggregations } from '@arranger/middleware';
import type { IResolvers } from '@graphql-tools/utils';
import type { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';
import type { EsClient } from './es/client.js';
import type { ExtendedEntry } from './schema/types.js';

export type ServerContext = {
    es: EsClient;
};

export type EntityResolverConfig = {
    entityName: string;
    esIndex: string;
    nestedFields: string[];
    extendedEntries: ExtendedEntry[];
    columnsState: unknown;
};

type HitsArgs = {
    filters?: unknown;
    first?: number;
};

type AggsArgs = {
    filters?: unknown;
    include_missing?: boolean;
    aggregations_filter_themselves?: boolean;
};

type ExtendedArgs = {
    fields?: string[];
};

// arranger's `normalizeFilters` short-circuits on falsy input (returns the
// filter as-is) but crashes on an empty `{}` SQON: it lacks an `op` field,
// hits the "Must specify op" error branch, and the error-message stringify
// path throws "Cannot convert object to primitive value" before the Error
// itself is constructed. Symptom is a TypeError with a confusing stack.
// Root cause is the missing-op SQON; the stringify failure is a side effect
// of how the Babel-transpiled middleware builds that error message.
// Coerce empty/missing SQONs to undefined at the boundary so we hit the
// falsy short-circuit cleanly.
function normalizeSqonInput(filters: unknown): unknown {
    if (filters == null) return undefined;
    if (typeof filters === 'object' && Object.keys(filters as object).length === 0) {
        return undefined;
    }
    return filters;
}

// Slice V — port of arranger-2.19.2/modules/mapping-utils/src/resolveHits.js
// `resolveNested` (lines 86-133). Walks an ES `_source` object and, for any
// field whose full dotted path is in `nestedFields`, replaces its value with
// the Connection-shaped `{ hits: { edges: [{ node }], total } }` payload
// that Apollo's default field resolvers can pick across for sub-Connection
// queries (`contacts { hits { edges { node { ... } } } }`). Non-nested
// values are walked through unchanged (objects recurse to find nested
// descendants; scalars pass through). The `isArray` scalar-wrap branch from
// arranger is omitted for now — add if real data needs it.
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
                            ...(item as Record<string, unknown>),
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

export function createResolvers(entities: EntityResolverConfig[]): IResolvers<unknown, ServerContext> {
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
                const res = await ctx.es.search<Record<string, unknown>>({
                    index: esIndex,
                    size: args.first ?? 10,
                    query,
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
            async aggregations(
                _parent: unknown,
                args: AggsArgs,
                ctx: ServerContext,
                info: GraphQLResolveInfo,
            ) {
                const requested = graphqlFields(info);
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
                // arranger's flattenAggregations keys nested-path results with
                // dots (`contacts.institution`), but GraphQL field names use
                // double underscores. Convert at the resolver boundary so the
                // default field resolver picks up the right key — verbatim
                // from arranger-2.19.2/modules/mapping-utils/src/resolveAggregations.js.
                return Object.fromEntries(
                    Object.entries(flat).map(([k, v]) => [k.replace(/\./g, '__'), v]),
                );
            },
        };
    }

    return result;
}
