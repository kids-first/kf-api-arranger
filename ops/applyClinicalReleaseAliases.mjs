/**
 * Apply a clinical-entity ES alias action (add or remove) for one release.
 *
 *   node ops/applyClinicalReleaseAliases.mjs --release=re_20240709_1 --action=add
 *   node ops/applyClinicalReleaseAliases.mjs --release=re_20240709_1 --action=remove --dry-run
 *
 * Scope: indices whose names start with one of the 5 clinical stems
 * (biospecimen_centric, participant_centric, study_centric, file_centric,
 * specimen_tree_centric) AND end with `_<release>`. Each matched index is
 * mapped stem(index) → index and the chosen --action is applied in a single
 * updateAliases call.
 *
 *   --action=add      point each clinical alias at this release's index.
 *   --action=remove   detach each clinical alias from this release's index.
 *                     Only mappings that currently exist are removed, so the
 *                     action is idempotent (re-running is a no-op rather than
 *                     a 404). Indices not presently aliased are skipped.
 *
 * Cutover between releases is two steps: `--action=remove` the old release,
 * then `--action=add` the new one. (This is NOT atomic — there is a brief
 * window between the two calls where the alias points at no index. If you need
 * a zero-gap swap, do the remove+add as a single updateAliases call instead.)
 *
 * Pre-confirmation output: a per-alias breakdown table + 1 sample pair per
 * entity, so a wrong release tag is visible at a glance.
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
        action: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
    },
    strict: true,
});
const releaseTag = values.release;
const action = values.action;
const isDryRun = values['dry-run'];

assert(releaseTag, 'Missing --release=<tag>. Example: --release=re_20240709_1');
assert(
    /^re_[a-zA-Z0-9_]+$/.test(releaseTag),
    `Invalid --release=${releaseTag}. Must match /^re_[a-zA-Z0-9_]+$/. Example: --release=re_20240709_1`,
);
assert(
    action === 'add' || action === 'remove',
    `Missing or invalid --action=${action}. Must be 'add' or 'remove'.`,
);

const CLINICAL_STEMS = [
    'biospecimen_centric',
    'participant_centric',
    'study_centric',
    'file_centric',
    'specimen_tree_centric',
];

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

// For `remove`, only emit actions for mappings that currently exist so the run
// is idempotent (the must_exist flag isn't available on ES 7.13 / OpenSearch).
let targetIndices = matchedIndices;
let skippedCount = 0;
if (action === 'remove') {
    const catAliasesResp = await client.cat.aliases({ h: 'alias,index', format: 'json' });
    assert(catAliasesResp.statusCode === 200, `cat.aliases failed: ${catAliasesResp.statusCode}`);

    const aliasedPairs = new Set();
    for (const { alias, index } of catAliasesResp.body) {
        if (stemOf(alias) === alias) aliasedPairs.add(`${alias}\t${index}`);
    }
    targetIndices = matchedIndices.filter(name => aliasedPairs.has(`${stemOf(name)}\t${name}`));
    skippedCount = matchedIndices.length - targetIndices.length;
}

const actions = targetIndices.map(name => ({
    [action]: { index: name, alias: stemOf(name) },
}));

if (actions.length === 0) {
    console.log(
        `Nothing to do: ${matchedIndices.length} index(es) match *_${releaseTag} but none are ` +
            'currently aliased, so there is nothing to remove.',
    );
    process.exit(0);
}

const breakdown = CLINICAL_STEMS.map(alias => ({
    alias,
    [`will_${action}`]: targetIndices.filter(name => stemOf(name) === alias).length,
}));

const sample = CLINICAL_STEMS.map(stem => {
    const idx = targetIndices.find(name => stemOf(name) === stem);
    return idx ? `${stem} ${action === 'add' ? '←' : '✕'} ${idx}` : null;
}).filter(Boolean);

console.log(`Alias ${action} target release: ${releaseTag}${isDryRun ? ' (dry-run)' : ''}`);
if (skippedCount > 0) {
    console.log(`Skipping ${skippedCount} matched index(es) not currently aliased.`);
}
console.log('');
console.log('Per-alias breakdown:');
console.table(breakdown);

console.log(`Sample ${action}s (one per entity):`);
for (const line of sample) console.log(`  - ${line}`);
console.log('');

if (isDryRun) {
    console.log(
        `DRY-RUN: would execute ${actions.length} ${action} action(s). No ES changes made.`,
    );
    process.exit(0);
}

const rl = readline.createInterface({ input, output });
let proceed;
try {
    const answer = await rl.question(`Apply ${actions.length} ${action} action(s)? y/N? `);
    proceed = answer.trim().toLowerCase() === 'y';
} finally {
    rl.close();
}
if (!proceed) {
    console.log('Aborted. No changes made.');
    process.exit(0);
}

const updateResp = await client.indices.updateAliases({ body: { actions } });
assert(updateResp.statusCode === 200, `updateAliases failed: ${updateResp.statusCode}`);
console.log('Done.', updateResp.body);
