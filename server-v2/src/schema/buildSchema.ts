// Orchestrator: assembles the full GraphQLSchema for one entity.
// Slice-S scope: just enough to make the read-path query
//   { <entity> { hits(filters, first) { total, edges { node { ... } } } } }
// run. Fields not exercised by the slice (mapping, extended, aggsState,
// columnsState, matchBoxState, aggregations) are intentionally omitted —
// see experiments/schemaGen/README.md "What's NOT done" + the C-narrow
// scope decision in session 3.

import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
} from 'graphql';
import { buildAggsType } from './buildAggsType.js';
import { buildNodeInterface, buildNodeType } from './buildNodeType.js';
import { GraphQLJSON } from './jsonScalar.js';
import type { ExtendedMap, FieldTree } from './types.js';

type BuildSchemaArgs = {
    tree: FieldTree;
    extendedMap: ExtendedMap;
    entityName: string;
};

export function buildSchema(args: BuildSchemaArgs): GraphQLSchema {
    const { tree, extendedMap, entityName } = args;

    const nodeInterface = buildNodeInterface();
    const nodeType = buildNodeType({ tree, extendedMap, entityName, nodeInterface });
    const aggsType = buildAggsType(tree, entityName);

    const edgeType = new GraphQLObjectType({
        name: `${entityName}Edge`,
        fields: () => ({
            searchAfter: { type: GraphQLJSON },
            node: { type: nodeType },
        }),
    });

    const connectionType = new GraphQLObjectType({
        name: `${entityName}Connection`,
        fields: () => ({
            total: { type: new GraphQLNonNull(GraphQLInt) },
            edges: { type: new GraphQLList(edgeType) },
        }),
    });

    const entityType = new GraphQLObjectType({
        name: entityName,
        fields: () => ({
            hits: {
                type: connectionType,
                args: {
                    filters: { type: GraphQLJSON },
                    first: { type: GraphQLInt },
                },
            },
            aggregations: {
                type: aggsType,
                args: {
                    filters: { type: GraphQLJSON },
                    include_missing: { type: GraphQLBoolean },
                    aggregations_filter_themselves: { type: GraphQLBoolean },
                },
            },
        }),
    });

    const rootType = new GraphQLObjectType({
        name: 'Root',
        fields: () => ({
            [entityName]: { type: entityType },
        }),
    });

    return new GraphQLSchema({
        query: rootType,
    });
}
