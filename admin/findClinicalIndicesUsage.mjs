/**
(WIP) Helper script to find unused indices
 * */
import { Client } from '@elastic/elasticsearch';
import assert from 'node:assert/strict';

import { esHost } from '../dist/src/env.js';
import { cbKeepClinicalPlusTranscriptomicsIndicesOnly, isIndexNameFromTranscriptomics } from './utils.mjs';

const client = new Client({ node: esHost });

const catIndicesResponse = await client.cat.indices({
    index: `*`,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const clinicalIndices = catIndicesResponse.body.filter(cbKeepClinicalPlusTranscriptomicsIndicesOnly);
assert(Array.isArray(clinicalIndices) && clinicalIndices.length > 0, 'No index found. Terminating');

const allAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});

const clinicalAliases = allAliases.body.filter(cbKeepClinicalPlusTranscriptomicsIndicesOnly);

const formatTableContent = (l, standardRePattern = true) =>
    l
        .filter(x => (standardRePattern ? x.index.includes('_re_') : !x.index.includes('_re_')))
        .sort((a, b) => b['creation.date'] - a['creation.date'])
        .map(x => {
            const release = standardRePattern
                ? 're_' + x.index.split('re_')[1]
                : x.index
                      .split('sd_')[1]
                      .split('_')
                      .slice(1)
                      .join('_');

            return [release, x['creation.date.string'], isIndexNameFromTranscriptomics(x.index)];
        })
        .reduce((xs, x) => (xs.some(y => y[0] === x[0] && y[2] === x[2]) ? xs : [...xs, x]), [])
        .map(x => ({ release: x[0], creation_date: x[1], transcriptomics: x[2] }));

const extractEntities = l => [...new Set(l.map(x => x.index.split('_centric')[0]))].map(x => `${x}_centric`);

const clinicalIndicesNotAliased = clinicalIndices.filter(x => clinicalAliases.every(a => a.index !== x.index));
const unaliasedClinicalIndicesWithCreationDate = formatTableContent(clinicalIndicesNotAliased);

console.log(`===== Not Aliased (pattern:re_*)`);
if (unaliasedClinicalIndicesWithCreationDate.length) {
    console.table(unaliasedClinicalIndicesWithCreationDate);
    console.log('Entities Involved: ');
    console.log(extractEntities(clinicalIndicesNotAliased));
} else {
    console.log('None');
}

console.log(`===== Aliased (pattern:re_*)`);
const clinicalIndicesAliased = clinicalIndices.filter(x => clinicalAliases.some(a => a.index === x.index));

//===== EDGE case
const showIfOnlyCbtn = re => {
    const isCbtnOnly = clinicalIndicesAliased
        .filter(x => x.index.endsWith(re))
        .every(x => x.index.includes('_sd_bhjxbdqk_'));
    return isCbtnOnly ? `${re} (cbtn only)` : re;
};

//======
const aliasedClinicalIndicesWithCreationDate = formatTableContent(clinicalIndicesAliased);
if (aliasedClinicalIndicesWithCreationDate.length) {
    console.table(aliasedClinicalIndicesWithCreationDate.map(x => ({ ...x, release: showIfOnlyCbtn(x.release) })));
    console.log('Entities Involved: ');
    console.log(extractEntities(clinicalIndicesAliased));
} else {
    console.log('None');
}

console.log(`===== Others (Clinical)`);
const othersClinical = formatTableContent(clinicalIndices, false);

if (othersClinical.length) {
    console.table(othersClinical);
    console.log('Entities Involved: ');
    console.log(extractEntities(clinicalIndices));
} else {
    console.log('None');
}
