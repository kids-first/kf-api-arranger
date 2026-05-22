// Orchestrator: assembles the full GraphQLSchema for one entity.
//
// Slice S (read path): `{ <entity> { hits(filters, first) { total, edges { node { ... } } } } }`
// Slice T (aggregations): `{ <entity> { aggregations(filters, include_missing, aggregations_filter_themselves) { ... } } }`
// Slice U (entity metadata): `extended(fields: [String]): JSON`, `columnsState: ColumnsState`.
//
// Frontend audit (2026-05-22) confirmed the other arranger entity-level
// fields (mapping, aggsState, matchBoxState) are not queried by
// include-portal-ui, so they remain omitted.

import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
} from 'graphql';
import { buildAggsType } from './buildAggsType.js';
import { buildNodeInterface, buildNodeType } from './buildNodeType.js';
import { GraphQLJSON } from './jsonScalar.js';
import { ColumnsStateType } from './stateTypes.js';
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
            extended: {
                type: GraphQLJSON,
                args: {
                    fields: { type: new GraphQLList(GraphQLString) },
                },
            },
            columnsState: { type: ColumnsStateType },
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
