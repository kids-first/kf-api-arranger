// Resolver factory.
// Slice S: Root.<entity> + <entity>.hits.
// Slice T (added 2026-05-21): <entity>.aggregations via
// @arranger/middleware.buildAggregations + flattenAggregations.

import { buildAggregations, buildQuery, flattenAggregations } from '@arranger/middleware';
import type { IResolvers } from '@graphql-tools/utils';
import type { GraphQLResolveInfo } from 'graphql';
import graphqlFields from 'graphql-fields';
import type { EsClient } from './es/client.js';

export type ServerContext = {
    es: EsClient;
    esIndex: string;
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

export function createResolvers(
    entityName: string,
    nestedFields: string[],
): IResolvers<unknown, ServerContext> {
    return {
        Root: {
            [entityName]: () => ({}),
        },
        [entityName]: {
            async hits(_parent: unknown, args: HitsArgs, ctx: ServerContext) {
                const sqon = normalizeSqonInput(args.filters);
                const built = buildQuery({ nestedFields, filters: sqon });
                const query = Object.keys(built).length > 0 ? built : { match_all: {} };
                const res = await ctx.es.search<Record<string, unknown>>({
                    index: ctx.esIndex,
                    size: args.first ?? 10,
                    query,
                    track_total_hits: true,
                });
                return {
                    total: res.hits.total.value,
                    edges: res.hits.hits.map(h => ({
                        searchAfter: h.sort,
                        node: { id: h._id, score: null, ...h._source },
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
                    index: ctx.esIndex,
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
        },
    };
}
