#!/usr/bin/env node
// Throwaway smoke test for server-v2 multi-entity setup against ES QA.
//
//   ES_HOST=https://your-qa-host node scripts/smoke.mjs
//
// Override the GraphQL endpoint with: SERVER_V2_URL=http://other-host:port
//
// What it does
// ------------
// Hits server-v2's GraphQL endpoint AND the underlying ES directly. For each
// of the 7 entities:
//   * checks hits.total, first node id, extended length, columnsState shape
//   * fetches the very same doc by ES `_doc/<id>` and cross-validates:
//       - GraphQL `node.id` matches ES `_id`
//       - For a TOP-LEVEL nested field that's populated on this doc, the
//         GraphQL `<field>.hits.total` equals `_source.<field>.length`
//   * Falls back to SKIP if the sampled doc has no populated nested data.

const ENDPOINT = process.env.SERVER_V2_URL ?? 'http://localhost:4000/';
const ES_HOST = process.env.ES_HOST;
if (!ES_HOST) {
    console.error('ES_HOST is not set. Use the same env the server uses, so cross-validation can hit the same cluster.');
    process.exit(2);
}
const ES_BASE = ES_HOST.replace(/\/+$/, ''); // strip trailing slashes

const ENTITIES = [
    { es: 'biospecimen_centric',     gql: 'biospecimen' },
    { es: 'file_centric',            gql: 'file' },
    { es: 'gene_centric',            gql: 'genes' },
    { es: 'participant_centric',     gql: 'participant' },
    { es: 'specimen_tree_centric',   gql: 'biospecimen_trees' },
    { es: 'study_centric',           gql: 'study' },
    { es: 'variant_centric',         gql: 'variants' },
];

async function gql(query) {
    const t0 = Date.now();
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    const json = await res.json();
    return { json, ms: Date.now() - t0 };
}

// Use _search with an ids query so we work across aliases that fan out to
// multiple backing indices (production pattern: <index>_<study>_<release>).
// `_doc/<id>` doesn't work on multi-index aliases.
async function esGetDoc(index, id) {
    const url = `${ES_BASE}/${encodeURIComponent(index)}/_search`;
    const t0 = Date.now();
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: { ids: { values: [id] } }, size: 1 }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
        const body = await res.text();
        return { ok: false, status: res.status, body, ms };
    }
    const json = await res.json();
    const hit = json?.hits?.hits?.[0];
    if (!hit) return { ok: false, status: 404, body: 'no hit for ids query', ms };
    return { ok: true, json: hit, ms };
}

let pass = 0, fail = 0, skip = 0;
const log = (status, msg) => {
    const icon = { PASS: '✓', FAIL: '✗', SKIP: '·' }[status] ?? '?';
    console.log(`  ${icon} [${status}] ${msg}`);
    if (status === 'PASS') pass++;
    else if (status === 'FAIL') fail++;
    else skip++;
};

console.log(`=== smoke: ${ENDPOINT} (ES_HOST=${ES_BASE}) ===\n`);

// (A) Introspection — all 7 entities at Root.
{
    const { json, ms } = await gql('{ __schema { queryType { fields { name } } } }');
    const names = json?.data?.__schema?.queryType?.fields?.map(f => f.name) ?? [];
    const missing = ENTITIES.filter(({ gql }) => !names.includes(gql)).map(({ gql }) => gql);
    if (missing.length === 0) log('PASS', `Root exposes all 7 entity fields (${ms}ms)`);
    else log('FAIL', `Root missing: ${missing.join(', ')}`);
    console.log(`     Root fields seen: ${names.join(', ')}`);
}

// (B) Per-entity battery.
for (const { es, gql: name } of ENTITIES) {
    console.log(`\n--- ${es} → ${name} ---`);

    // hits.total
    {
        const { json, ms } = await gql(`{ ${name} { hits { total } } }`);
        const total = json?.data?.[name]?.hits?.total;
        const err = json?.errors?.[0]?.message;
        if (typeof total === 'number') log('PASS', `hits.total = ${total.toLocaleString()} (${ms}ms)`);
        else log('FAIL', `hits.total error: ${err ?? JSON.stringify(json).slice(0, 200)}`);
    }

    // first node id (via GraphQL)
    let firstId = null;
    {
        const { json, ms } = await gql(`{ ${name} { hits(first: 1) { edges { node { id } } } } }`);
        firstId = json?.data?.[name]?.hits?.edges?.[0]?.node?.id;
        const err = json?.errors?.[0]?.message;
        if (typeof firstId === 'string' && firstId.length > 0) log('PASS', `first node id = "${firstId}" (${ms}ms)`);
        else if (firstId === null && !err) log('SKIP', `no docs in index (empty)`);
        else log('FAIL', `first node id: ${err ?? JSON.stringify(json).slice(0, 200)}`);
    }

    // extended (slice U)
    let extendedArr = null;
    {
        const { json, ms } = await gql(`{ ${name} { extended } }`);
        extendedArr = json?.data?.[name]?.extended;
        const err = json?.errors?.[0]?.message;
        if (Array.isArray(extendedArr) && extendedArr.length > 0) log('PASS', `extended has ${extendedArr.length} entries (${ms}ms)`);
        else log('FAIL', `extended: ${err ?? JSON.stringify(extendedArr)?.slice(0, 200)}`);
    }

    // columnsState (slice U)
    {
        const { json, ms } = await gql(`{ ${name} { columnsState { state { type keyField } } } }`);
        const cs = json?.data?.[name]?.columnsState;
        const err = json?.errors?.[0]?.message;
        if (cs?.state && typeof cs.state.type === 'string') {
            log('PASS', `columnsState.state.type="${cs.state.type}" keyField="${cs.state.keyField}" (${ms}ms)`);
        } else if (cs === null) {
            log('SKIP', `columnsState is null (no config for this entity)`);
        } else {
            log('FAIL', `columnsState: ${err ?? JSON.stringify(cs)?.slice(0, 200)}`);
        }
    }

    // --- ES cross-validation block --------------------------------------
    if (!firstId) {
        log('SKIP', `cross-validation skipped — no first node id`);
        continue;
    }
    const doc = await esGetDoc(es, firstId);
    if (!doc.ok) {
        log('FAIL', `ES _doc fetch failed (HTTP ${doc.status}): ${doc.body.slice(0, 200)}`);
        continue;
    }

    // id roundtrip — server-v2 sets node.id = ES _id
    if (doc.json._id === firstId) log('PASS', `ES _id matches GraphQL node.id (${doc.ms}ms)`);
    else log('FAIL', `ES _id="${doc.json._id}" vs GraphQL node.id="${firstId}"`);

    const source = doc.json._source ?? {};

    // Find a TOP-LEVEL nested field that's populated on this doc.
    const topLevelNested = (extendedArr ?? [])
        .filter(e => e?.type === 'nested' && typeof e?.field === 'string' && !e.field.includes('.'))
        .map(e => e.field);
    const populatedNested = topLevelNested.find(f => {
        const v = source[f];
        return Array.isArray(v) ? v.length > 0 : v != null && typeof v === 'object';
    });

    if (!populatedNested) {
        log('SKIP', `no top-level nested field populated on this doc (top-level nested fields: ${topLevelNested.join(', ') || 'none'})`);
        continue;
    }

    const srcVal = source[populatedNested];
    const expectedCount = Array.isArray(srcVal) ? srcVal.length : (srcVal == null ? 0 : 1);
    const q = `{ ${name} { hits(first: 1) { edges { node { id ${populatedNested} { hits { total } } } } } } }`;
    const { json: j2, ms } = await gql(q);
    const gotId = j2?.data?.[name]?.hits?.edges?.[0]?.node?.id;
    const gotTotal = j2?.data?.[name]?.hits?.edges?.[0]?.node?.[populatedNested]?.hits?.total;
    const err = j2?.errors?.[0]?.message;

    if (gotId !== firstId) {
        log('SKIP', `cross-validation drifted onto a different doc (got ${gotId}, expected ${firstId}); resolver-shape ok if not paged`);
    } else if (typeof gotTotal !== 'number') {
        log('FAIL', `${populatedNested}.hits.total missing: ${err ?? JSON.stringify(j2).slice(0, 200)}`);
    } else if (gotTotal !== expectedCount) {
        log('FAIL', `${populatedNested}.hits.total = ${gotTotal} but ES _source.${populatedNested}.length = ${expectedCount}`);
    } else {
        log('PASS', `${populatedNested}.hits.total = ${gotTotal} matches ES _source (${ms}ms)`);
    }
}

console.log(`\n=== ${pass} pass · ${fail} fail · ${skip} skip ===`);
process.exit(fail > 0 ? 1 : 0);
