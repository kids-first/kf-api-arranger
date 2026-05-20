// Loads the arranger-projects-<project> doc for one esIndex (e.g. "study_centric")
// and returns the extended-mapping Map + the graphqlField/entity name.
// Both come from the same project doc, so we read once.

import fs from 'node:fs';
import type { ExtendedEntry, ExtendedMap } from './types.js';

type ProjectDoc = {
    _id: string;
    _source: {
        name: string;
        config: {
            extended: ExtendedEntry[];
        };
    };
};

type ProjectsResponse = {
    hits?: { hits?: ProjectDoc[] };
};

export function loadExtendedMapping(
    projectsJsonPath: string,
    esIndex: string,
): { map: ExtendedMap; entityName: string } {
    const j = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8')) as ProjectsResponse;
    const hits = j.hits?.hits ?? [];
    const doc = hits.find(h => h._id === esIndex);
    if (!doc) throw new Error(`No project doc found for _id=${esIndex}`);
    const extended = doc._source?.config?.extended;
    if (!Array.isArray(extended)) throw new Error('config.extended is not an array');
    const entityName = doc._source?.name;
    if (!entityName) throw new Error(`No _source.name on doc for _id=${esIndex}`);
    const map: ExtendedMap = new Map();
    for (const entry of extended) map.set(entry.field, entry);
    return { map, entityName };
}
