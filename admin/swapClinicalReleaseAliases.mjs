/**
 * Atomic swap of the 5 clinical-entity aliases to point at the indices
 * tagged with a given release.
 *
 *   node admin/swapClinicalReleaseAliases.mjs --release=re_20240709_1
 *   node admin/swapClinicalReleaseAliases.mjs --release=re_20240709_1 --dry-run
 *
 * In one updateAliases call: removes every (alias → index) currently mapped
 * under biospecimen_centric, participant_centric, study_centric, file_centric,
 * specimen_tree_centric; then adds new mappings to every index ending in
 * `_<release>` whose name starts with one of those stems.
 *
 * Pre-confirmation output: a per-alias breakdown table + 3 sample pairs
 * from each list, so a wrong release tag is visible at a glance.
 *
 * Does NOT validate completeness (missing entities, count drift) — that's
 * a separate concern handled elsewhere.
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

const stemOf = name => CLINICAL_STEMS.find(s => name.startsWith(s));

const client = new Client({ node: esHost });

const catAliasesResp = await client.cat.aliases({ h: 'alias,index', format: 'json' });
assert(catAliasesResp.statusCode === 200, `cat.aliases failed: ${catAliasesResp.statusCode}`);

const removeActions = catAliasesResp.body
    .filter(({ alias }) => stemOf(alias) === alias)
    .map(({ alias, index }) => ({ remove: { index, alias } }));

// Server-side narrowing: comma-separated stem patterns combined with the
// release tail. Far smaller response and prevents accidental matches on
// unrelated indices ending in the same tail.
const indexPattern = CLINICAL_STEMS.map(s => `${s}*_${releaseTag}`).join(',');

const catIndicesResp = await client.cat.indices({
    index: indexPattern,
    h: 'index',
    format: 'json',
});
assert(catIndicesResp.statusCode === 200, `cat.indices failed: ${catIndicesResp.statusCode}`);

const newIndices = catIndicesResp.body
    .map(x => x.index)
    .filter(name => stemOf(name) !== undefined)
    .toSorted();

const addActions = newIndices.map(name => ({
    add: { index: name, alias: stemOf(name) },
}));

const actions = [...removeActions, ...addActions];

if (actions.length === 0) {
    console.log(
        `Nothing to do: no clinical aliases currently set AND no indices match *_${releaseTag}.`,
    );
    process.exit(0);
}

const countByAlias = (acts, verb) =>
    acts.reduce((m, a) => m.set(a[verb].alias, (m.get(a[verb].alias) || 0) + 1), new Map());
const removeByAlias = countByAlias(removeActions, 'remove');
const addByAlias = countByAlias(addActions, 'add');
const breakdown = CLINICAL_STEMS.map(alias => ({
    alias,
    will_remove: removeByAlias.get(alias) || 0,
    will_add: addByAlias.get(alias) || 0,
}));

const sample = (acts, verb) =>
    CLINICAL_STEMS.map(stem => acts.find(a => a[verb].alias === stem))
        .filter(Boolean)
        .map(a => `${a[verb].alias} ← ${a[verb].index}`);

console.log(`Swap target release: ${releaseTag}${isDryRun ? ' (dry-run)' : ''}`);
console.log('');
console.log('Per-alias breakdown:');
console.table(breakdown);

if (removeActions.length > 0) {
    console.log('Sample removes (one per entity):');
    for (const line of sample(removeActions, 'remove')) console.log(`  - ${line}`);
}
if (addActions.length > 0) {
    console.log('Sample adds (one per entity):');
    for (const line of sample(addActions, 'add')) console.log(`  - ${line}`);
}
console.log('');

if (isDryRun) {
    console.log(
        `DRY-RUN: would execute ${actions.length} action(s) ` +
            `(${removeActions.length} remove, ${addActions.length} add). No ES changes made.`,
    );
    process.exit(0);
}

const rl = readline.createInterface({ input, output });
let proceed;
try {
    const answer = await rl.question('Proceed y/N? ');
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
