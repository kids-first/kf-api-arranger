// ES-mode entity loaders. Mirrors the file-mode `loadEntity` in schema/index.ts,
// but pulls mappings + per-entity config from real ES instead of local JSON
// fixtures. Used by `npm run dev` at startup; the file-mode path stays for
// __check__.ts (regression test against the committed arranger SDL).
//
// Two ES calls per startup (plus mapping fetches, paralleled):
//   1. _search on arranger-projects-<projectId>  → all per-entity config docs
//      in one round trip. Configured via the arranger Admin UI in Overture
//      land, but for KF/INCLUDE this doc is the only source of truth for
//      `extended` + `columns-state` (see project-overview memory).
//   2. _mapping on each <esIndex>  → ES properties tree. Aliases that fan
//      out to multiple backing indices (production pattern:
//      <index>_<study>_<release>) return one entry per backing — all share
//      the same logical mapping, so `buildFieldTree` picking
//      Object.keys()[0] is correct.

import { GraphQLObjectType } from 'graphql';
import type { EsClient } from '../es/client.js';
import { buildAggsType } from './buildAggsType.js';
import { buildEntityType } from './buildConnectionFamily.js';
import { collectNestedFields, buildFieldTree } from './fieldTree.js';
import { parseProjectDoc, type ProjectDoc } from './extendedMapping.js';
import type { EntityModule } from './index.js';

// One ES call: fetches all per-entity config docs from arranger-projects-<projectId>.
// Returns a Map keyed by _id (which matches esIndex, e.g. "study_centric").
export async function fetchAllProjectDocs(
    es: EsClient,
    projectId: string,
): Promise<Map<string, ProjectDoc>> {
    const res = await es.search<ProjectDoc['_source']>({
        index: `arranger-projects-${projectId}`,
        size: 100,
        track_total_hits: true,
    });
    const docs = new Map<string, ProjectDoc>();
    for (const hit of res.hits.hits) {
        docs.set(hit._id, { _id: hit._id, _source: hit._source });
    }
    return docs;
}

// One ES call: fetches the mapping for one index (or alias). The response
// is already in the shape `buildFieldTree` consumes (`{[indexName]: {mappings: {properties}}}`).
async function fetchMapping(
    es: EsClient,
    esIndex: string,
): Promise<Record<string, unknown>> {
    return es.getMapping(esIndex) as unknown as Record<string, unknown>;
}

// Same shape as schema/index.ts:loadEntity, but takes pre-fetched data
// instead of file paths. Synchronous given the inputs.
function buildEntityModule(
    esIndex: string,
    mapping: Record<string, unknown>,
    doc: ProjectDoc,
): EntityModule {
    // buildFieldTree's RawMapping type matches the ES _mapping response shape
    // exactly; cast is structural, not nominal.
    const tree = buildFieldTree(mapping as Parameters<typeof buildFieldTree>[0]);
    const { map: extendedMap, entries: extendedEntries, columnsState, entityName } =
        parseProjectDoc(doc);
    const aggsType = buildAggsType(tree, entityName);
    const entityType: GraphQLObjectType = buildEntityType({
        entityName,
        fields: tree.fields,
        extendedMap,
        aggsType,
    });
    const nestedFields = collectNestedFields(tree);
    return {
        entityName,
        esIndex,
        entityType,
        nestedFields,
        extendedEntries,
        columnsState,
        tree,
        extendedMap,
    };
}

// Top-level loader: 1 ES call for projects + N parallel mapping fetches.
// Throws clearly if a configured esIndex has no matching project doc.
export async function loadAllEntitiesFromEs(
    es: EsClient,
    projectId: string,
    esIndices: readonly string[],
): Promise<EntityModule[]> {
    const [projectDocs, mappings] = await Promise.all([
        fetchAllProjectDocs(es, projectId),
        Promise.all(esIndices.map(esIndex => fetchMapping(es, esIndex))),
    ]);
    return esIndices.map((esIndex, i) => {
        const doc = projectDocs.get(esIndex);
        if (!doc) {
            throw new Error(
                `No project doc found for _id=${esIndex} in arranger-projects-${projectId}. ` +
                `Available _ids: ${[...projectDocs.keys()].join(', ') || '(none)'}`,
            );
        }
        return buildEntityModule(esIndex, mappings[i], doc);
    });
}
