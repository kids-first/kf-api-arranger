/**
 * Delete every clinical-entity ES index ending in `_<release>`.
 *
 *   node ops/deleteClinicalIndicesByRelease.mjs --release=re_20240709_1
 *   node ops/deleteClinicalIndicesByRelease.mjs --release=re_20240709_1 --dry-run
 *
 * Scope: indices whose names start with biospecimen_centric, participant_centric,
 * study_centric, file_centric, or specimen_tree_centric AND end with `_<release>`.
 *
 * Safety guard: if any matched index is currently aliased under one of the 5
 * clinical alias names, the entire operation is refused — both real and
 * dry-run. The refusal lists the offending indices with their aliases and
 * exits with code 1. Non-clinical aliases pointing at clinical indices are
 * NOT detected by this guard; clean those up separately if you have any.
 *
 * Pre-confirmation output: per-entity breakdown + 1 sample per entity.
 * Deletion is chunked (50 indices per call) to keep request URLs within
 * default HTTP line-length limits; on partial failure the count deleted
 * so far is reported and exit code is 2.
 */
import 'dotenv/config';

import { Client } from '@elastic/elasticsearch';
import assert from 'node:assert/strict';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { parseArgs } from 'node:util';

const esHost = process.env.ES_HOST;
assert(esHost, 'ES_HOST environment variable must be set (export it or set it in .env)');

const { values } = parseArgs({
    options: {
        release: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
});
const releaseTag = values.release;
const isDryRun = values['dry-run'];

assert(releaseTag, 'Missing --release=<tag>. Example: --release=re_20240709_1');
assert(
    /^re_[a-zA-Z0-9_]+$/.test(releaseTag),
    `Invalid --release=${releaseTag}. Must match /^re_[a-zA-Z0-9_]+$/. Example: --release=re_20240709_1`,
);

const CLINICAL_STEMS = [
    'biospecimen_centric',
    'participant_centric',
    'study_centric',
    'file_centric',
    'specimen_tree_centric',
];
const DELETE_CHUNK_SIZE = 50;

const stemOf = name => CLINICAL_STEMS.find(s => name.startsWith(s));

const client = new Client({ node: esHost });

// Server-side narrowing via comma-separated stem patterns + release tail.
const indexPattern = CLINICAL_STEMS.map(s => `${s}*_${releaseTag}`).join(',');

const catIndicesResp = await client.cat.indices({
    index: indexPattern,
    h: 'index',
    format: 'json',
});
assert(catIndicesResp.statusCode === 200, `cat.indices failed: ${catIndicesResp.statusCode}`);

const matchedIndices = catIndicesResp.body
    .map(x => x.index)
    .filter(name => stemOf(name) !== undefined)
    .toSorted();

if (matchedIndices.length === 0) {
    console.log(`Nothing to do: no clinical indices match *_${releaseTag}.`);
    process.exit(0);
}

// Safety guard: refuse if any matched index is aliased under a clinical alias.
const catAliasesResp = await client.cat.aliases({ h: 'alias,index', format: 'json' });
assert(catAliasesResp.statusCode === 200, `cat.aliases failed: ${catAliasesResp.statusCode}`);

const aliasByIndex = new Map();
for (const { alias, index } of catAliasesResp.body) {
    if (stemOf(alias) === alias) aliasByIndex.set(index, alias);
}

const aliasedTargets = matchedIndices
    .filter(idx => aliasByIndex.has(idx))
    .map(idx => ({ index: idx, alias: aliasByIndex.get(idx) }));

if (aliasedTargets.length > 0) {
    console.log(
        `REFUSED: ${aliasedTargets.length} of ${matchedIndices.length} matched indices are currently aliased.`,
    );
    const countByAlias = aliasedTargets.reduce(
        (m, { alias }) => m.set(alias, (m.get(alias) || 0) + 1),
        new Map(),
    );
    const aliasBreakdown = CLINICAL_STEMS.map(alias => ({
        alias,
        n_aliased: countByAlias.get(alias) || 0,
    })).filter(r => r.n_aliased > 0);
    console.table(aliasBreakdown);

    console.log('Sample aliased (one per alias):');
    for (const stem of CLINICAL_STEMS) {
        const ex = aliasedTargets.find(a => a.alias === stem);
        if (ex) console.log(`  - ${ex.index} → ${ex.alias}`);
    }
    console.log('');
    console.log('Hint: run swapClinicalReleaseAliases.mjs to point at a different release first, then re-run.');
    process.exit(1);
}

const breakdown = CLINICAL_STEMS.map(stem => ({
    entity: stem,
    will_delete: matchedIndices.filter(n => stemOf(n) === stem).length,
}));

const sample = indices =>
    CLINICAL_STEMS.map(stem => indices.find(name => stemOf(name) === stem)).filter(Boolean);

const nBatches = Math.ceil(matchedIndices.length / DELETE_CHUNK_SIZE);

console.log(`Delete target release: ${releaseTag}${isDryRun ? ' (dry-run)' : ''}`);
console.log(`Total: ${matchedIndices.length} indices (${nBatches} batch(es) of up to ${DELETE_CHUNK_SIZE})`);
console.log('');
console.log('Per-entity breakdown:');
console.table(breakdown);

console.log('Sample deletions (one per entity):');
for (const idx of sample(matchedIndices)) console.log(`  - ${idx}`);
console.log('');

if (isDryRun) {
    console.log(
        `DRY-RUN: would delete ${matchedIndices.length} index(es) in ${nBatches} batch(es). No ES changes made.`,
    );
    process.exit(0);
}

const rl = readline.createInterface({ input, output });
let proceed;
try {
    const answer = await rl.question(`Delete ${matchedIndices.length} indices? y/N? `);
    proceed = answer.trim().toLowerCase() === 'y';
} finally {
    rl.close();
}
if (!proceed) {
    console.log('Aborted. No changes made.');
    process.exit(0);
}

let deletedSoFar = 0;
for (let i = 0; i < matchedIndices.length; i += DELETE_CHUNK_SIZE) {
    const chunk = matchedIndices.slice(i, i + DELETE_CHUNK_SIZE);
    const batchNo = Math.floor(i / DELETE_CHUNK_SIZE) + 1;
    try {
        const resp = await client.indices.delete({ index: chunk });
        assert(
            resp.statusCode === 200,
            `indices.delete batch ${batchNo}/${nBatches} returned ${resp.statusCode}`,
        );
        deletedSoFar += chunk.length;
        console.log(`  batch ${batchNo}/${nBatches}: deleted ${chunk.length} indices`);
    } catch (e) {
        console.error(
            `Error during batch ${batchNo}/${nBatches} (${deletedSoFar}/${matchedIndices.length} deleted so far):`,
            e.message,
        );
        process.exit(2);
    }
}
console.log(`Done. Deleted ${matchedIndices.length} indices in ${nBatches} batch(es).`);
