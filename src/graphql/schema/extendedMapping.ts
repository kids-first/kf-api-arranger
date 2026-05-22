// Loads the arranger-projects-<project> doc for one esIndex (e.g. "study_centric")
// and surfaces exactly what the server needs: the extended-mapping Map +
// the raw extended entries + the columnsState data + the entity name.
//
// Slice U (2026-05-22) added `entries` (for the `extended` GraphQL field)
// and `columnsState` (passed through to the `columnsState` resolver).
//
// Two paths share the same doc-shape parser (`parseProjectDoc`):
//   • file path (this module's `loadExtendedMapping`) — used by __check__.ts
//     against the committed JSON fixture.
//   • ES path (esLoaders.ts) — used by `npm run dev` against real ES.

import fs from 'node:fs';
import type { ExtendedEntry, ExtendedMap } from './types.js';

// Wire shape of the per-entity config sub-tree we read from. Lives at
// `_source.config` in the arranger-projects-<name> doc. We type only the
// keys we read.
type EntityConfigWire = {
    extended?: ExtendedEntry[];
    'columns-state'?: unknown;
};

export type ProjectDoc = {
    _id: string;
    _source: {
        name: string;
        config: EntityConfigWire;
    };
};

type ProjectsResponse = {
    hits?: { hits?: ProjectDoc[] };
};

export type ParsedProjectDoc = {
    map: ExtendedMap;
    entries: ExtendedEntry[];
    columnsState: unknown;
    entityName: string;
};

// Shared between file-mode (`loadExtendedMapping`) and ES-mode (`esLoaders.ts`):
// converts one project doc into the `{map, entries, columnsState, entityName}`
// shape the schema builder needs.
export function parseProjectDoc(doc: ProjectDoc): ParsedProjectDoc {
    const config = doc._source?.config;
    if (!config) throw new Error(`No _source.config on doc for _id=${doc._id}`);
    const entries = config.extended;
    if (!Array.isArray(entries)) throw new Error(`config.extended is not an array (_id=${doc._id})`);
    const entityName = doc._source?.name;
    if (!entityName) throw new Error(`No _source.name on doc for _id=${doc._id}`);
    const map: ExtendedMap = new Map();
    for (const entry of entries) map.set(entry.field, entry);
    const columnsState = config['columns-state'] ?? null;
    return { map, entries, columnsState, entityName };
}

export function loadExtendedMapping(
    projectsJsonPath: string,
    esIndex: string,
): ParsedProjectDoc {
    const parsed = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8')) as ProjectsResponse;
    const hits = parsed.hits?.hits ?? [];
    const doc = hits.find(h => h._id === esIndex);
    if (!doc) throw new Error(`No project doc found for _id=${esIndex}`);
    return parseProjectDoc(doc);
}
