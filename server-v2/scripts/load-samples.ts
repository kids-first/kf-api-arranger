// Loads a JSON array of _source objects (as pasted from Kibana) into the
// backing index of an entity. Uses the primaryKey field from the
// arranger-projects extended mapping as ES _id when available; otherwise
// ES autogens an _id.
//
// Usage: npx tsx scripts/load-samples.ts <es_index>
//   Reads:  ../experiments/data/samples/<es_index>.json
//   Writes: <es_index>_local_1 (the backing index)

import fs from 'node:fs';
import { loadExtendedMapping } from '../src/schema/extendedMapping.js';

const ES_HOST = process.env.ES_HOST ?? 'http://localhost:9200';
const REPO_ROOT = '..';
const BATCH_SIZE = 500;

const esIndex = process.argv[2];
if (!esIndex) {
    console.error('Usage: npx tsx scripts/load-samples.ts <es_index>');
    process.exit(1);
}

const backingIndex = `${esIndex}_local_1`;
const samplesPath = `${REPO_ROOT}/experiments/data/samples/${esIndex}.json`;
const projectsPath = `${REPO_ROOT}/experiments/data/arranger-projects/include.json`;

const rawSamples = fs.readFileSync(samplesPath, 'utf8');
const samples = JSON.parse(unwrapKibanaHeredocs(rawSamples)) as Record<string, unknown>[];
if (!Array.isArray(samples)) {
    console.error(`expected a JSON array in ${samplesPath}`);
    process.exit(1);
}
if (samples.length === 0) {
    console.error(`${samplesPath} is empty — paste sample _source objects from Kibana first`);
    process.exit(1);
}

const { map: extendedMap } = loadExtendedMapping(projectsPath, esIndex);
const pkEntry = Array.from(extendedMap.values()).find(e => e.primaryKey === true);
const pkField = pkEntry?.field;

console.log(`source: ${samplesPath} (${samples.length} docs)`);
console.log(`target: ${backingIndex} on ${ES_HOST}`);
console.log(`_id field: ${pkField ?? '(ES autogen)'}`);

// Replaces every Kibana `"""..."""` heredoc with a properly JSON-escaped
// string. JSON.stringify on the inner content handles backslashes, quotes,
// and control chars (including the literal newlines that break JSON.parse).
function unwrapKibanaHeredocs(jsonish: string): string {
    return jsonish.replace(/"""([\s\S]*?)"""/g, (_, content: string) => JSON.stringify(content));
}

// Accepts either:
//   - source-only shape (an object that doesn't have a `_source` key)
//   - full-hit shape (an object with `_index`, `_id`, `_source`, etc.)
// Returns the source object and (if present) the original `_id`.
function extractIdAndSource(item: Record<string, unknown>): {
    id?: string;
    source: Record<string, unknown>;
} {
    if ('_source' in item && typeof item._source === 'object' && item._source !== null) {
        return {
            id: typeof item._id === 'string' ? item._id : undefined,
            source: item._source as Record<string, unknown>,
        };
    }
    return { source: item };
}

type BulkItem = { index?: { error?: unknown } };
let total = 0;

async function flush(batch: string[]): Promise<void> {
    if (batch.length === 0) return;
    const body = batch.join('\n') + '\n';
    const res = await fetch(`${ES_HOST}/${backingIndex}/_bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-ndjson' },
        body,
    });
    if (!res.ok) {
        console.error(`\nbulk HTTP ${res.status}:`, await res.text());
        process.exit(1);
    }
    const j = (await res.json()) as { errors: boolean; items: BulkItem[] };
    if (j.errors) {
        const firstError = j.items.find(i => i.index?.error);
        console.error(`\nbulk reported errors; first:`, JSON.stringify(firstError));
    }
    total += batch.length / 2;
    process.stdout.write(`\rindexed ${total} docs...`);
}

let batch: string[] = [];
for (const item of samples) {
    const { id: hitId, source } = extractIdAndSource(item);
    const id = hitId ?? (pkField ? source[pkField] : undefined);
    const meta = id !== undefined ? { index: { _id: String(id) } } : { index: {} };
    batch.push(JSON.stringify(meta));
    batch.push(JSON.stringify(source));
    if (batch.length >= BATCH_SIZE * 2) {
        await flush(batch);
        batch = [];
    }
}
await flush(batch);
console.log(`\ndone: ${total} docs loaded into ${backingIndex} (alias ${esIndex})`);
