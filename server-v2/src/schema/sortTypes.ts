// Sort input — used by `hits(sort: [Sort], ...)`. Module-level singleton
// (one instance shared across all entity wrappers, like stateTypes.ts).
//
// Matches arranger's `Sort` input shape: `{ field, order, missing }`.
// Arranger doesn't define an enum for `order`; it's just a `String` ("asc"/"desc").
// Resolver-side, we translate into ES body.sort shape with arranger's
// `missing` defaults + nested-path detection.

import { GraphQLInputObjectType, GraphQLString } from 'graphql';

export const SortInputType = new GraphQLInputObjectType({
    name: 'Sort',
    fields: () => ({
        field: { type: GraphQLString },
        order: { type: GraphQLString },
        missing: { type: GraphQLString },
    }),
});
