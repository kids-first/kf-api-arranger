// Entry point for the schema module.
// Reads an ES mapping JSON + an arranger-projects doc, returns a GraphQLSchema
// (and the derived intermediates, for inspection/testing).

import fs from 'node:fs';
import type { GraphQLSchema } from 'graphql';
import { buildFieldTree } from './fieldTree.js';
import { loadExtendedMapping } from './extendedMapping.js';
import { buildSchema } from './buildSchema.js';
import type { ExtendedMap, FieldTree } from './types.js';

type LoadSchemaArgs = {
    mappingPath: string;
    projectsPath: string;
    esIndex: string;
};

type LoadSchemaResult = {
    schema: GraphQLSchema;
    entityName: string;
    tree: FieldTree;
    extendedMap: ExtendedMap;
};

export function loadSchema(args: LoadSchemaArgs): LoadSchemaResult {
    const mapping = JSON.parse(fs.readFileSync(args.mappingPath, 'utf8'));
    const tree = buildFieldTree(mapping);
    const { map: extendedMap, entityName } = loadExtendedMapping(args.projectsPath, args.esIndex);
    const schema = buildSchema({ tree, extendedMap, entityName });
    return { schema, entityName, tree, extendedMap };
}

export type { LoadSchemaArgs, LoadSchemaResult };
