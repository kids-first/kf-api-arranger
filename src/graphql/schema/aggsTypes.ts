// The 4 shared aggregation types.
//
// Not yet exposed (no consumer requires them): NumericAggregations.histogram,
// Aggregations.buckets(max:) arg, and Aggregations.cardinality.
// top_hits + filter_by_term were added for the /phenotypes route.

import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';
import { GraphQLJSON } from './jsonScalar.js';

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
        // Used by /phenotypes (flattened by flattenAggregations — top_hits
        // returns the picked _source projection, filter_by_term returns just
        // `{doc_count}`).
        top_hits: {
            type: GraphQLJSON,
            args: {
                _source: { type: new GraphQLList(GraphQLString) },
                size: { type: GraphQLInt },
            },
        },
        filter_by_term: {
            type: GraphQLJSON,
            args: { filter: { type: GraphQLJSON } },
        },
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
