// Creates a backing index + alias for one entity from its fixture mapping.
// Usage: npx tsx scripts/bootstrap-index.ts <es_index>
//
// Result:
//   PUT  /<es_index>_local_1     with the fixture's .mappings
//   POST /_aliases               actions: [{ add: <es_index>_local_1 → <es_index> }]
//
// We use a backing-index + alias arrangement (rather than just creating the
// index as <es_index> directly) to mirror prod, where arranger queries the
// alias and ops swap backing indices on reindex.

import fs from 'node:fs';

const ES_HOST = process.env.ES_HOST ?? 'http://localhost:9200';
const REPO_ROOT = '..';

const esIndex = process.argv[2];
if (!esIndex) {
    console.error('Usage: npx tsx scripts/bootstrap-index.ts <es_index>');
    process.exit(1);
}

const backingIndex = `${esIndex}_local_1`;
const mappingPath = `${REPO_ROOT}/experiments/data/mappings/${esIndex}.json`;
const settingsPath = `${REPO_ROOT}/experiments/data/settings/${esIndex}.json`;

const mappingFixture = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const mappings = mappingFixture[Object.keys(mappingFixture)[0]].mappings;

// Settings are optional. Drop a `GET <index>/_settings` response from prod
// under experiments/data/settings/<es_index>.json to seed analyzers /
// normalizers (e.g. `custom_normalizer`) needed by the mapping.
let settings: unknown = undefined;
if (fs.existsSync(settingsPath)) {
    const settingsFixture = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings = settingsFixture[Object.keys(settingsFixture)[0]].settings;
    console.log(`loaded settings from ${settingsPath}`);
} else {
    console.log(`no settings fixture at ${settingsPath} — mapping-only PUT`);
}

const delRes = await fetch(`${ES_HOST}/${backingIndex}`, { method: 'DELETE' });
console.log(`DELETE /${backingIndex}: ${delRes.status}`);

const createBody = settings ? { settings, mappings } : { mappings };
const createRes = await fetch(`${ES_HOST}/${backingIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
});
console.log(`PUT /${backingIndex}: ${createRes.status}`);
if (!createRes.ok) {
    console.error(await createRes.text());
    process.exit(1);
}

const aliasRes = await fetch(`${ES_HOST}/_aliases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        actions: [{ add: { index: backingIndex, alias: esIndex } }],
    }),
});
console.log(`POST /_aliases: ${aliasRes.status}`);
if (!aliasRes.ok) {
    console.error(await aliasRes.text());
    process.exit(1);
}

console.log(`\nready: ${esIndex} (alias) → ${backingIndex} (backing) on ${ES_HOST}`);
