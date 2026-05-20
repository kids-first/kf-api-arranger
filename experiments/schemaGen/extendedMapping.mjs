// Loads the arranger-projects-include doc for one esIndex (e.g. "study_centric")
// and returns the extended-mapping Map (keyed by dotted field path) + the
// graphqlField/entity name. Both come from the same project doc, so we read once.

import fs from 'node:fs';

export function loadExtendedMapping(projectsJsonPath, esIndex) {
    const j = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8'));
    const hits = j.hits?.hits ?? [];
    const doc = hits.find(h => h._id === esIndex);
    if (!doc) throw new Error(`No project doc found for _id=${esIndex}`);
    const extended = doc._source?.config?.extended;
    if (!Array.isArray(extended)) throw new Error('config.extended is not an array');
    const entityName = doc._source?.name;
    if (!entityName) throw new Error(`No _source.name on doc for _id=${esIndex}`);
    const map = new Map();
    for (const entry of extended) map.set(entry.field, entry);
    return { map, entityName };
}
