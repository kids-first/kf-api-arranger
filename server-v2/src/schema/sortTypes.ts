// Sort input — used by `hits(sort: [Sort], ...)`. Module-level singleton
// (one instance shared across all entity wrappers, like stateTypes.ts).
//
// Matches arranger's `Sort` input shape exactly:
//   input Sort { field: String!, order: Order, mode: Mode, missing: Missing }
//   enum Order   { asc, desc }
//   enum Mode    { avg, max, min, sum }
//   enum Missing { first, last }
//
// `mode` is in the schema for SDL parity but our resolver doesn't consume it
// — the FE never sends it. Add to `buildEsSort` in resolvers.ts if/when used.
// `missing` arrives at the resolver as the enum's string name ('first'/'last');
// buildEsSort prepends the ES-required '_' (→ '_first'/'_last').

import { GraphQLEnumType, GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';

const OrderEnumType = new GraphQLEnumType({
    name: 'Order',
    values: { asc: {}, desc: {} },
});

const ModeEnumType = new GraphQLEnumType({
    name: 'Mode',
    values: { avg: {}, max: {}, min: {}, sum: {} },
});

const MissingEnumType = new GraphQLEnumType({
    name: 'Missing',
    values: { first: {}, last: {} },
});

export const SortInputType = new GraphQLInputObjectType({
    name: 'Sort',
    fields: () => ({
        field: { type: new GraphQLNonNull(GraphQLString) },
        order: { type: OrderEnumType },
        mode: { type: ModeEnumType },
        missing: { type: MissingEnumType },
    }),
});
