// Resolver factory for slice S.
// Builds a resolver map for `Root.<entity>` and `<entity>.hits` given
// the entity name (the graphqlField from the project doc) and the list
// of nested-field dotted paths (so @arranger/middleware's buildQuery can
// wrap ES `nested` queries correctly).

import { buildQuery } from '@arranger/middleware';
import type { IResolvers } from '@graphql-tools/utils';
import type { EsClient } from './es/client.js';

export type ServerContext = {
    es: EsClient;
    esIndex: string;
};

type HitsArgs = {
    filters?: unknown;
    first?: number;
};

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
                const built = buildQuery({ nestedFields, filters: args.filters });
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
        },
    };
}
