// Entry point for the schema module.
//
// Multi-entity (slice X): one Apollo schema contains all N entities; the
// frontend hits a single endpoint for `participant`, `study`, `file`, etc.
// `loadEntity` does the per-entity work (mapping, project doc, type build);
// `buildSchema` assembles N entity types into one schema + Root.

import fs from 'node:fs';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import { buildAggsType } from './buildAggsType.js';
import { buildEntityType } from './buildConnectionFamily.js';
import { collectNestedFields, buildFieldTree } from './fieldTree.js';
import { loadExtendedMapping } from './extendedMapping.js';
import type { ExtendedEntry, ExtendedMap, FieldTree } from './types.js';

export type LoadEntityArgs = {
    mappingPath: string;
    projectsPath: string;
    esIndex: string;
};

// Everything one entity needs at runtime: the GraphQL type (for schema
// assembly) + the data the entity's resolvers close over.
export type EntityModule = {
    entityName: string;
    esIndex: string;
    entityType: GraphQLObjectType;
    nestedFields: string[];
    extendedEntries: ExtendedEntry[];
    columnsState: unknown;
    // Kept around for diagnostics / __check__.ts.
    tree: FieldTree;
    extendedMap: ExtendedMap;
};

export function loadEntity(args: LoadEntityArgs): EntityModule {
    const mapping = JSON.parse(fs.readFileSync(args.mappingPath, 'utf8'));
    const tree = buildFieldTree(mapping);
    const { map: extendedMap, entries: extendedEntries, columnsState, entityName } =
        loadExtendedMapping(args.projectsPath, args.esIndex);
    const aggsType = buildAggsType(tree, entityName);
    const entityType = buildEntityType({
        entityName,
        fields: tree.fields,
        extendedMap,
        aggsType,
    });
    const nestedFields = collectNestedFields(tree);
    return {
        entityName,
        esIndex: args.esIndex,
        entityType,
        nestedFields,
        extendedEntries,
        columnsState,
        tree,
        extendedMap,
    };
}

export function buildSchema(entities: EntityModule[]): GraphQLSchema {
    const rootType = new GraphQLObjectType({
        name: 'Root',
        fields: () => Object.fromEntries(
            entities.map(e => [e.entityName, { type: e.entityType }]),
        ),
    });
    return new GraphQLSchema({ query: rootType });
}
