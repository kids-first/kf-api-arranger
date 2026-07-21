/**
 * Read-only stats inventory for clinical-entity ES indices of a release.
 *
 *   node ops/clinicalReleaseStats.mjs --release=re_20240709_1
 *
 * Two outputs:
 *   1. Global summary: total docs per entity across the release.
 *   2. Per-study breakdown: doc counts per (study, entity). Sorted
 *      alphabetically by study_code (case-insensitive); rows whose
 *      study_code couldn't be resolved float to the bottom.
 *
 * Scope: 5 clinical stems (study, participant, biospecimen, file,
 * specimen_tree). Doc counts come from a single search with a terms agg
 * on the `_index` metadata field (live, searchable counts). Study codes
 * are resolved by a separate search on study_centric.
 *
 * Exit 0 always — informational. ES errors throw normally.
 */
import 'dotenv/config';

import { Client } from '@elastic/elasticsearch';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';

const esHost = process.env.ES_HOST;
assert(esHost, 'ES_HOST environment variable must be set (export it or set it in .env)');

const { values } = parseArgs({
    options: { release: { type: 'string' } },
    strict: true,
});
const releaseTag = values.release;

assert(releaseTag, 'Missing --release=<tag>. Example: --release=re_20240709_1');
assert(
    /^re_[a-zA-Z0-9_]+$/.test(releaseTag),
    `Invalid --release=${releaseTag}. Must match /^re_[a-zA-Z0-9_]+$/. Example: --release=re_20240709_1`,
);

// Display column order. Short column names; full stem used internally for ES.
const ENTITY_COLS = [
    { stem: 'study_centric', col: 'study' },
    { stem: 'participant_centric', col: 'participant' },
    { stem: 'biospecimen_centric', col: 'biospecimen' },
    { stem: 'file_centric', col: 'file' },
    { stem: 'specimen_tree_centric', col: 'specimen_tree' },
];
const STEMS = ENTITY_COLS.map(e => e.stem);

const stemOf = name => STEMS.find(s => name.startsWith(s));

const client = new Client({ node: esHost });

// Per-index doc counts via a single search with a terms agg on the
// `_index` metadata field. Search-time counts only include live,
// searchable docs — sidesteps any `cat.indices.docs.count` quirks
// (closed indices, pre-refresh segments, etc.) that could inflate sums.
// Same data source as v1's `getGlobalClinicalStats`.
const indexPattern = STEMS.map(s => `${s}*_${releaseTag}`).join(',');
const TERMS_BUCKET_CAP = 10000;
const searchResp = await client.search({
    index: indexPattern,
    body: {
        size: 0,
        track_total_hits: false,
        aggs: {
            per_index: {
                terms: { field: '_index', size: TERMS_BUCKET_CAP },
            },
        },
    },
});
assert(searchResp.statusCode === 200, `search failed: ${searchResp.statusCode}`);

const buckets = searchResp.body.aggregations?.per_index?.buckets ?? [];
if (buckets.length === TERMS_BUCKET_CAP) {
    console.warn(
        `WARNING: per-index bucket count hit ${TERMS_BUCKET_CAP} — some indices may be missing from the report.`,
    );
}

// Parse each bucket into (stem, study_id, count). Naming is
// `<stem>_<study_id>_<release>` — strip prefix + suffix → study_id.
const parsed = buckets.flatMap(b => {
    const stem = stemOf(b.key);
    if (!stem) return [];
    const middle = b.key.slice(stem.length + 1, b.key.length - (releaseTag.length + 1));
    if (!middle) {
        console.warn(`WARNING: could not parse study_id from index "${b.key}"`);
        return [];
    }
    return [{ stem, study_id: middle, count: b.doc_count }];
});

if (parsed.length === 0) {
    console.log(`Nothing found: no clinical indices match *_${releaseTag}.`);
    process.exit(0);
}

// study_id → study_code via single search on study_centric.
// `size: 10000` is the ES default max-hits without scroll; well above
// any conceivable INCLUDE study count. Overflow falls back to '(unknown)'.
const studyCodeResp = await client.search({
    index: `study_centric*_${releaseTag}`,
    body: {
        _source: ['study_id', 'study_code'],
        size: 10000,
    },
});
assert(studyCodeResp.statusCode === 200, `study_code search failed: ${studyCodeResp.statusCode}`);

const studyCodeMap = new Map();
for (const hit of studyCodeResp.body.hits?.hits ?? []) {
    const sid = hit._source?.study_id;
    const code = hit._source?.study_code;
    if (sid && code) studyCodeMap.set(sid.toLowerCase(), code);
}

// Aggregate counts per study.
const perStudy = new Map();
for (const p of parsed) {
    if (!perStudy.has(p.study_id)) {
        perStudy.set(p.study_id, Object.fromEntries(STEMS.map(s => [s, 0])));
    }
    perStudy.get(p.study_id)[p.stem] += p.count;
}

// Build per-study rows.
const rows = [...perStudy.entries()].map(([study_id, counts]) => {
    const row = {
        study_id,
        study_code: studyCodeMap.get(study_id.toLowerCase()) ?? '(unknown)',
    };
    for (const { stem, col } of ENTITY_COLS) {
        row[col] = counts[stem];
    }
    return row;
});

// Sort alphabetically by study_code (case-insensitive); unknowns at bottom.
rows.sort((a, b) => {
    const aUnknown = a.study_code === '(unknown)';
    const bUnknown = b.study_code === '(unknown)';
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    return a.study_code.localeCompare(b.study_code, undefined, { sensitivity: 'base' });
});

// Global summary, derived from per-study rows so the two tables cannot
// drift apart (single source of truth).
const globalSummary = ENTITY_COLS.map(({ stem, col }) => ({
    entity: stem,
    total_docs: rows.reduce((sum, row) => sum + row[col], 0),
}));

console.log(`Release: ${releaseTag}`);
console.log(`Studies: ${rows.length}`);
console.log('');
console.log('Global summary:');
console.table(globalSummary);

console.log('Per-study breakdown:');
console.table(rows);
