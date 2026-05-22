// The 4 shared aggregation types — vendored programmatically from
// arranger-2.19.2/modules/schema/src/Aggregations.js. Field order matches
// arranger exactly so future SDL parity checks have a chance.
//
// Slice-T scope: omits Bucket.top_hits, Bucket.filter_by_term,
// NumericAggregations.histogram, Aggregations.buckets(max:) arg, and
// Aggregations.cardinality. All addressable in slice T+1.

import {
    GraphQLFloat,
    GraphQLInt,
    GraphQLList,
    GraphQLObjectType,
    GraphQLString,
} from 'graphql';

export const Stats = new GraphQLObjectType({
    name: 'Stats',
    fields: () => ({
        max: { type: GraphQLFloat },
        min: { type: GraphQLFloat },
        count: { type: GraphQLInt },
        avg: { type: GraphQLFloat },
        sum: { type: GraphQLFloat },
    }),
});

export const Bucket = new GraphQLObjectType({
    name: 'Bucket',
    fields: () => ({
        doc_count: { type: GraphQLInt },
        key: { type: GraphQLString },
        key_as_string: { type: GraphQLString },
    }),
});

export const NumericAggregations = new GraphQLObjectType({
    name: 'NumericAggregations',
    fields: () => ({
        stats: { type: Stats },
    }),
});

export const Aggregations = new GraphQLObjectType({
    name: 'Aggregations',
    fields: () => ({
        bucket_count: { type: GraphQLInt },
        buckets: { type: new GraphQLList(Bucket) },
    }),
});
