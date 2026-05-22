// Orchestrator: assembles the full GraphQLSchema for one entity.
//
// Slice S (read path): `{ <entity> { hits(filters, first) { total, edges { node { ... } } } } }`
// Slice T (aggregations): `{ <entity> { aggregations(filters, include_missing, aggregations_filter_themselves) { ... } } }`
// Slice U (entity metadata): `extended(fields: [String]): JSON`, `columnsState: ColumnsState`.
// Slice V (nested sub-Connections): recursive — `<entity> { contacts { hits { edges { node { ... } } } } }` etc.
//
// Frontend audit (2026-05-22) confirmed the other arranger entity-level
// fields (mapping, aggsState, matchBoxState) are not queried by
// include-portal-ui, so they remain omitted at both entity and sub levels.

import {
    GraphQLObjectType,
    GraphQLSchema,
} from 'graphql';
import { buildAggsType } from './buildAggsType.js';
import { buildConnectionFamily, buildEntityType, buildNodeInterface } from './buildConnectionFamily.js';
import type { ExtendedMap, FieldTree } from './types.js';

type BuildSchemaArgs = {
    tree: FieldTree;
    extendedMap: ExtendedMap;
    entityName: string;
};

export function buildSchema(args: BuildSchemaArgs): GraphQLSchema {
    const { tree, extendedMap, entityName } = args;

    const nodeInterface = buildNodeInterface();
    const aggsType = buildAggsType(tree, entityName);
    const entityType = buildEntityType({
        entityName,
        fields: tree.fields,
        extendedMap,
        aggsType,
        nodeInterface,
    });

    const rootType = new GraphQLObjectType({
        name: 'Root',
        fields: () => ({
            [entityName]: { type: entityType },
        }),
    });

    return new GraphQLSchema({ query: rootType });
}

// Re-exported for __check__.ts and tests.
export { buildConnectionFamily, buildNodeInterface };
