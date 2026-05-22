// Loads the arranger-projects-<project> doc for one esIndex (e.g. "study_centric")
// and surfaces exactly what the server needs: the extended-mapping Map +
// the raw extended entries + the columnsState data + the entity name.
//
// Slice U (2026-05-22) added `entries` (for the `extended` GraphQL field)
// and `columnsState` (passed through to the `columnsState` resolver).

import fs from 'node:fs';
import type { ExtendedEntry, ExtendedMap } from './types.js';

// Internal — the wire shape of the per-entity config sub-tree we read from.
// Today this lives at `_source.config` in the arranger-projects-<name>
// doc; future-V2 may relocate it. We type only the keys we read.
type EntityConfigWire = {
    extended?: ExtendedEntry[];
    'columns-state'?: unknown;
};

type ProjectDoc = {
    _id: string;
    _source: {
        name: string;
        config: EntityConfigWire;
    };
};

type ProjectsResponse = {
    hits?: { hits?: ProjectDoc[] };
};

export function loadExtendedMapping(
    projectsJsonPath: string,
    esIndex: string,
): {
    map: ExtendedMap;
    entries: ExtendedEntry[];
    columnsState: unknown;
    entityName: string;
} {
    const parsed = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8')) as ProjectsResponse;
    const hits = parsed.hits?.hits ?? [];
    const doc = hits.find(h => h._id === esIndex);
    if (!doc) throw new Error(`No project doc found for _id=${esIndex}`);
    const config = doc._source?.config;
    if (!config) throw new Error(`No _source.config on doc for _id=${esIndex}`);
    const entries = config.extended;
    if (!Array.isArray(entries)) throw new Error(`config.extended is not an array (_id=${esIndex})`);
    const entityName = doc._source?.name;
    if (!entityName) throw new Error(`No _source.name on doc for _id=${esIndex}`);
    const map: ExtendedMap = new Map();
    for (const entry of entries) map.set(entry.field, entry);
    const columnsState = config['columns-state'] ?? null;
    return { map, entries, columnsState, entityName };
}
