// ES-mode entity loaders. Pulls `_mapping` per entity from real ES and
// derives the per-entity `extended` array in-memory via `deriveExtended`.
// One ES call per startup, per entity (paralleled).
//
// Aliases that fan out to multiple backing indices (production pattern:
// <index>_<study>_<release>) return one entry per backing — all share the
// same logical mapping, so `buildFieldTree` picking Object.keys()[0] is
// correct.

import type { GraphQLObjectType } from 'graphql';
import type { EsClient } from '../../es/client.js';
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
    const { map: extendedMap, entries: extendedEntries, fallbackHits } = deriveExtended(esIndex, entityName, tree);
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
        fallbackHits,
    };
}

// A missing index surfaces as a 404 (index_not_found_exception) from the ES
// client. Required entities rethrow (boot stays fail-fast); `optional` entities
// swallow only the 404 and are skipped, so a deployment that simply lacks the
// index — e.g. INCLUDE has no variant_somatic_centric — boots cleanly without
// it. Any other error (network, auth, malformed mapping) still propagates.
function isIndexNotFound(err: unknown): boolean {
    const e = err as { statusCode?: number; meta?: { statusCode?: number }; message?: string };
    return e?.statusCode === 404 || e?.meta?.statusCode === 404 || /index_not_found/i.test(e?.message ?? '');
}

export async function loadAllEntitiesFromEs(
    es: EsClient,
    entities: ReadonlyArray<{ esIndex: string; entityName: string; optional?: boolean }>,
): Promise<EntityModule[]> {
    const loaded = await Promise.all(
        entities.map(async ({ esIndex, entityName, optional }) => {
            try {
                return buildEntityModule(esIndex, entityName, await fetchMapping(es, esIndex));
            } catch (err) {
                if (optional && isIndexNotFound(err)) {
                    console.info(
                        `[entities] optional index "${esIndex}" absent; skipping GraphQL entity "${entityName}"`,
                    );
                    return null;
                }
                throw err;
            }
        }),
    );
    return loaded.filter((e): e is EntityModule => e !== null);
}
