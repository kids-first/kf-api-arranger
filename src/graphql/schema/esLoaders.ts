// ES-mode entity loaders. Pulls `_mapping` per entity from real ES and
// derives the per-entity `extended` array in-memory via `deriveExtended`.
// One ES call per startup, per entity (paralleled).
//
// Aliases that fan out to multiple backing indices (production pattern:
// <index>_<study>_<release>) return one entry per backing — all share the
// same logical mapping, so `buildFieldTree` picking Object.keys()[0] is
// correct.

import type { GraphQLObjectType } from 'graphql';
import type { EsClient } from '../es/client.js';
import { buildAggsType } from './buildAggsType.js';
import { buildEntityType } from './buildConnectionFamily.js';
import { deriveExtended } from './deriveExtended.js';
import { buildFieldTree, collectNestedFields } from './fieldTree.js';
import type { EntityModule } from './index.js';

// One ES call: fetches the mapping for one index (or alias). The response
// is already in the shape `buildFieldTree` consumes (`{[indexName]: {mappings: {properties}}}`).
async function fetchMapping(es: EsClient, esIndex: string): Promise<Record<string, unknown>> {
    return es.getMapping(esIndex) as unknown as Record<string, unknown>;
}

function buildEntityModule(esIndex: string, entityName: string, mapping: Record<string, unknown>): EntityModule {
    // buildFieldTree's RawMapping type matches the ES _mapping response shape
    // exactly; cast is structural, not nominal.
    const tree = buildFieldTree(mapping as Parameters<typeof buildFieldTree>[0]);
    const {
        map: extendedMap,
        entries: extendedEntries,
        columnsState,
        fallbackHits,
    } = deriveExtended(esIndex, entityName, tree);
    const aggsType = buildAggsType(tree, entityName);
    const entityType: GraphQLObjectType = buildEntityType({
        entityName,
        fields: tree.fields,
        extendedMap,
        aggsType,
    });
    return {
        entityName,
        esIndex,
        entityType,
        nestedFields: collectNestedFields(tree),
        extendedEntries,
        columnsState,
        fallbackHits,
    };
}

export async function loadAllEntitiesFromEs(
    es: EsClient,
    entities: ReadonlyArray<{ esIndex: string; entityName: string }>,
): Promise<EntityModule[]> {
    const mappings = await Promise.all(entities.map(({ esIndex }) => fetchMapping(es, esIndex)));
    return entities.map(({ esIndex, entityName }, i) => buildEntityModule(esIndex, entityName, mappings[i]));
}
