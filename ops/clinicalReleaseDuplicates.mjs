/**
 * Read-only duplicate-key check on clinical-entity ES indices for a release.
 *
 *   node ops/clinicalReleaseDuplicates.mjs --release=re_20240709_1
 *
 * Per entity, runs a terms agg on the entity's unique-ID field with
 * `min_doc_count: 2` to surface any keys appearing 2+ times. A non-empty
 * bucket result means the release has duplicate documents — block promotion
 * until investigated.
 *
 * Field map (INCLUDE):
 *   study_centric         → study_id
 *   participant_centric   → participant_id
 *   file_centric          → file_id
 *   biospecimen_centric   → fhir_id
 *   specimen_tree_centric → fhir_id
 *
 * Bucket size cap is 5. `dups_found` shows the surfaced count; a trailing
 * `+` (e.g., `5+`) means more duplicate keys exist beyond the cap (derived
 * from the terms agg's `sum_other_doc_count`). `example_dup_keys` shows
 * the first 3 with their doc counts — `PT-001(3)` means 3 documents share
 * the `PT-001` key.
 *
 * Exit codes: 0 if clean, 1 if any entity has duplicates or per-entity
 * query errors.
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

const ID_FIELD = {
    study_centric: 'study_id',
    participant_centric: 'participant_id',
    file_centric: 'file_id',
    biospecimen_centric: 'fhir_id',
    specimen_tree_centric: 'fhir_id',
};
const ENTITIES_IN_ORDER = Object.keys(ID_FIELD);
const TERMS_SIZE = 5;
const EXAMPLES_TO_SHOW = 3;

const client = new Client({ node: esHost });

const mSearchBody = ENTITIES_IN_ORDER.flatMap(entity => [
    { index: `${entity}*_${releaseTag}` },
    {
        size: 0,
        aggs: {
            duplicates: {
                terms: {
                    field: ID_FIELD[entity],
                    size: TERMS_SIZE,
                    min_doc_count: 2,
                },
            },
        },
    },
]);

const mSearchResp = await client.msearch({ body: mSearchBody });
assert(mSearchResp.statusCode === 200, `msearch failed: ${mSearchResp.statusCode}`);

const responses = mSearchResp.body?.responses;
assert(Array.isArray(responses), 'msearch response missing .responses array');
assert(
    responses.length === ENTITIES_IN_ORDER.length,
    `msearch returned ${responses.length} responses, expected ${ENTITIES_IN_ORDER.length}`,
);

const results = ENTITIES_IN_ORDER.map((entity, i) => {
    const r = responses[i];
    if (r?.error) {
        return {
            row: {
                entity,
                id_field: ID_FIELD[entity],
                dups_found: 'ERROR',
                example_dup_keys: r.error?.type ?? 'see logs',
            },
            hasDups: false,
            error: r.error,
        };
    }
    const buckets = r?.aggregations?.duplicates?.buckets ?? [];
    const sumOther = r?.aggregations?.duplicates?.sum_other_doc_count ?? 0;
    const sample = buckets.slice(0, EXAMPLES_TO_SHOW).map(b => `${b.key}(${b.doc_count})`);
    return {
        row: {
            entity,
            id_field: ID_FIELD[entity],
            dups_found: `${buckets.length}${sumOther > 0 ? '+' : ''}`,
            example_dup_keys: sample.length ? sample.join(', ') : '(none)',
        },
        hasDups: buckets.length > 0,
    };
});

const dirty = results.filter(r => r.hasDups);
const errored = results.filter(r => r.error);

console.log(`Release: ${releaseTag}`);
console.table(results.map(r => r.row));

if (errored.length > 0) {
    console.log('\nQuery errors:');
    for (const e of errored) {
        const msg =
            [e.error?.type, e.error?.reason].filter(Boolean).join(': ') ||
            JSON.stringify(e.error);
        console.log(`  - ${e.row.entity}: ${msg}`);
    }
}

if (dirty.length > 0) {
    const parts = [`${dirty.length} entity(ies) with duplicates`];
    if (errored.length > 0) parts.push(`${errored.length} with query errors`);
    console.log(`\nDUPS FOUND: ${parts.join(', ')}. Release should not be promoted.`);
    process.exit(1);
} else if (errored.length > 0) {
    console.log(
        `\nERRORS: ${errored.length} entity(ies) had query errors — cleanliness unverified.`,
    );
    process.exit(1);
}

console.log('\nCLEAN: no duplicates in any clinical entity.');
process.exit(0);
