#!/usr/bin/env node
// Hit a local arranger (talking to ES QA) for each CASES entry and write the
// `data` field of every response to scripts/baselines.json. diff-real.mjs
// reads that file as the `expected` baseline for each case.
//
//   ARRANGER_URL=http://localhost:5050/include/graphql node scripts/fetch-baselines.mjs
//
// Defaults to http://localhost:5050/include/graphql (the production URL
// pattern: <projectId>/graphql).
//
// If a case errors, it's logged and skipped — its baseline isn't written, so
// diff-real falls back to CAPTURE mode for that case until the baseline is
// fixed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.mjs';

const ARRANGER_URL = process.env.ARRANGER_URL ?? 'http://localhost:5050/include/graphql';
const FILTER = process.argv[2];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, 'baselines.json');

async function gqlPost(query) {
    const body = typeof query === 'string' ? { query } : query;
    const t0 = Date.now();
    const res = await fetch(ARRANGER_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    return { json, ms: Date.now() - t0, httpStatus: res.status };
}

console.log(`=== fetch-baselines: ${ARRANGER_URL} ===`);
const cases = FILTER ? CASES.filter(c => c.name.includes(FILTER)) : CASES;
console.log(`(${cases.length} of ${CASES.length} case(s))\n`);

// Merge with any existing baselines so partial runs don't wipe prior data.
let baselines = {};
if (fs.existsSync(OUT_PATH)) {
    try {
        baselines = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
        console.log(`Loaded ${Object.keys(baselines).length} existing baseline(s) from ${path.relative(process.cwd(), OUT_PATH)}\n`);
    } catch (err) {
        console.warn(`Could not parse existing ${OUT_PATH}: ${err.message}. Starting fresh.\n`);
        baselines = {};
    }
}

let written = 0, skipped = 0;

for (const c of cases) {
    console.log(`[${c.name}]`);
    let result;
    try {
        result = await gqlPost(c.query);
    } catch (err) {
        console.log(`  ✗ NETWORK error: ${err.message}`);
        skipped++;
        continue;
    }
    if (result.httpStatus !== 200) {
        console.log(`  ✗ HTTP ${result.httpStatus} — body: ${JSON.stringify(result.json).slice(0, 200)}`);
        skipped++;
        continue;
    }
    if (result.json.errors) {
        console.log(`  ✗ GraphQL errors (${result.ms}ms):`);
        result.json.errors.slice(0, 3).forEach(e => console.log(`    ${e.message}`));
        skipped++;
        continue;
    }
    baselines[c.name] = result.json.data;
    const lines = JSON.stringify(result.json.data, null, 2).split('\n').length;
    console.log(`  ✓ ${result.ms}ms — ${lines} lines captured`);
    written++;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(baselines, null, 2) + '\n', 'utf8');
console.log(`\nWrote ${path.relative(process.cwd(), OUT_PATH)}  (${Object.keys(baselines).length} total baseline(s))`);
console.log(`=== ${written} written · ${skipped} skipped ===`);
process.exit(skipped > 0 ? 1 : 0);
