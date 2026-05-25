// Entry point for the schema module.
//
// Multi-entity (slice X): one Apollo schema contains all N entities; the
// frontend hits a single endpoint for `participant`, `study`, `file`, etc.
// `buildSchema` assembles N entity types into one schema + Root.
// Per-entity loading lives in `esLoaders.ts` (real ES → `deriveExtended`).

import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import type { ExtendedEntry } from './types.js';

// Everything one entity needs at runtime: the GraphQL type (for schema
// assembly) + the data the entity's resolvers close over.
export type EntityModule = {
    entityName: string;
    esIndex: string;
    entityType: GraphQLObjectType;
    nestedFields: string[];
    extendedEntries: ExtendedEntry[];
    columnsState: unknown;
};

export function buildSchema(entities: EntityModule[]): GraphQLSchema {
    const rootType = new GraphQLObjectType({
        name: 'Root',
        fields: () => Object.fromEntries(entities.map(e => [e.entityName, { type: e.entityType }])),
    });
    return new GraphQLSchema({ query: rootType });
}
