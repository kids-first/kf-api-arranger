/**
 * Read-only inventory of clinical (+ transcriptomics) ES indices, grouped
 * by (release_id, type) and bucketed by alias state.
 *
 *   ES_HOST=https://… node admin/clinicalReleaseInventory.mjs
 *
 * - Two tables: releases whose every index is aliased, and everything else.
 * - `aliased` column shows n/N; mixed groups are tagged `(partial)`.
 * - `entities` column shows coverage of the 5 clinical stems (or 2
 *   transcriptomics stems), with missing names listed.
 * - Sort: newest creation date first.
 * - Indices that don't match the `*_re_*` release pattern are grouped under
 *   `(no _re_ pattern)` and the count + examples are warned at the end.
 *
 * No writes. No CLI args.
 */
import 'dotenv/config';

import { Client } from '@elastic/elasticsearch';
import assert from 'node:assert/strict';

const esHost = process.env.ES_HOST;
assert(esHost, 'ES_HOST environment variable must be set (export it or set it in .env)');

const CLINICAL_STEMS = [
    'study_centric',
    'participant_centric',
    'biospecimen_centric',
    'file_centric',
    'specimen_tree_centric',
];
const TRANSCRIPTOMICS_STEMS = ['sample_gene_exp', 'diff_gene_exp'];
const ALL_STEMS = [...CLINICAL_STEMS, ...TRANSCRIPTOMICS_STEMS];

const NO_RELEASE = '(no _re_ pattern)';

const stemOf = indexName => ALL_STEMS.find(s => indexName.startsWith(s));
const typeOf = stem => (CLINICAL_STEMS.includes(stem) ? 'clinical' : 'transcriptomics');
// Greedy `.*` makes this anchor on the LAST `_re_` in the name, so an index
// like `<entity>_re_foo_re_bar` resolves to `re_bar` (the trailing release).
const releaseOf = indexName => {
    const m = /.*_re_(.+)$/.exec(indexName);
    return m ? `re_${m[1]}` : NO_RELEASE;
};
const trimStem = s => s.replace(/_centric$/, '').replace(/_gene_exp$/, '');

const formatEntities = (presentStems, allStems) => {
    if (presentStems.length === allStems.length) {
        return `${allStems.length}/${allStems.length}`;
    }
    const missing = allStems.filter(s => !presentStems.includes(s)).map(trimStem);
    return `${presentStems.length}/${allStems.length} (-${missing.join(', ')})`;
};

const formatAliased = (aliasedCount, total) => {
    if (aliasedCount === 0 || aliasedCount === total) {
        return `${aliasedCount}/${total}`;
    }
    return `${aliasedCount}/${total} (partial)`;
};

const client = new Client({ node: esHost });

// Server-side filter via comma-separated stem patterns — far smaller response
// than `*` on clusters with thousands of unrelated indices.
const indexPattern = ALL_STEMS.map(s => `${s}*`).join(',');

const catIndicesResp = await client.cat.indices({
    index: indexPattern,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});
assert(catIndicesResp.statusCode === 200, `cat.indices failed: ${catIndicesResp.statusCode}`);

const catAliasesResp = await client.cat.aliases({ h: 'alias,index', format: 'json' });
assert(catAliasesResp.statusCode === 200, `cat.aliases failed: ${catAliasesResp.statusCode}`);

const aliasedIndexNames = new Set(catAliasesResp.body.map(a => a.index));

const enriched = catIndicesResp.body.flatMap(x => {
    const stem = stemOf(x.index);
    if (!stem) return [];
    return [
        {
            index: x.index,
            stem,
            type: typeOf(stem),
            release: releaseOf(x.index),
            creationDate: Number(x['creation.date']),
            creationDateStr: x['creation.date.string'],
            aliased: aliasedIndexNames.has(x.index),
        },
    ];
});

const groups = Object.groupBy(enriched, e => `${e.release}|${e.type}`);

const enrichedGroups = Object.values(groups).map(members => {
    const { release, type } = members[0];
    const allStems = type === 'clinical' ? CLINICAL_STEMS : TRANSCRIPTOMICS_STEMS;
    const presentStems = [...new Set(members.map(m => m.stem))];
    const aliasedCount = members.filter(m => m.aliased).length;
    const latest = members.reduce((a, b) => (b.creationDate > a.creationDate ? b : a));
    return {
        row: {
            release,
            type,
            n_indices: members.length,
            entities: formatEntities(presentStems, allStems),
            aliased: formatAliased(aliasedCount, members.length),
            creation_date: latest.creationDateStr,
        },
        sortKey: latest.creationDate,
        allAliased: aliasedCount === members.length,
    };
});

const sorted = enrichedGroups.toSorted((a, b) => b.sortKey - a.sortKey);

const aliasedRows = sorted.filter(g => g.allAliased).map(g => g.row);
const notAliasedRows = sorted.filter(g => !g.allAliased).map(g => g.row);

console.log('===== ALIASED releases =====');
if (aliasedRows.length) {
    console.table(aliasedRows);
} else {
    console.log('None');
}

console.log('===== NOT ALIASED releases =====');
if (notAliasedRows.length) {
    console.table(notAliasedRows);
} else {
    console.log('None');
}

const noReleaseMembers = enriched.filter(e => e.release === NO_RELEASE);
if (noReleaseMembers.length) {
    const examples = noReleaseMembers.slice(0, 5).map(e => e.index);
    console.warn(
        `\nWARNING: ${noReleaseMembers.length} index(es) did not match the *_re_* release pattern.`,
    );
    console.warn(`Examples: ${examples.join(', ')}${noReleaseMembers.length > 5 ? ', …' : ''}`);
}
