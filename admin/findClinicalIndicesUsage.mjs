/**
(WIP) Helper script to find unused indices
 * */
import assert from 'node:assert/strict';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const client = new Client({ node: esHost });

const catIndicesResponse = await client.cat.indices({
    index: `*centric*`,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const cbKeepClinicalIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study'].some(stem => x.index.includes(stem));

const clinicalIndices = catIndicesResponse.body.filter(cbKeepClinicalIndicesOnly);
assert(Array.isArray(clinicalIndices) && clinicalIndices.length > 0, 'No index found. Terminating');

const allAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});

const clinicalAliases = allAliases.body.filter(cbKeepClinicalIndicesOnly);

const makeReleaseToCreationDate = l =>
    l
        .filter(x => x.index.includes('_re_'))
        .sort((a, b) => b['creation.date'] - a['creation.date'])
        .map(x => ['re_' + x.index.split('re_')[1], x['creation.date.string']])
        .reduce((xs, x) => (xs.some(y => y[0] === x[0]) ? xs : [...xs, x]), [])
        .map(x => ({ release: x[0], creation_date: x[1] }));

const clinicalIndicesNotAliased = clinicalIndices.filter(x => clinicalAliases.every(a => a.index !== x.index));
const unaliasedClinicalIndicesWithCreationDate = makeReleaseToCreationDate(clinicalIndicesNotAliased);
console.log(`===== Not Aliased`);

unaliasedClinicalIndicesWithCreationDate.length
    ? console.table(unaliasedClinicalIndicesWithCreationDate)
    : console.log('None');

console.log(`===== Aliased`);
const clinicalIndicesAliased = clinicalIndices.filter(x => clinicalAliases.some(a => a.index === x.index));
const aliasedClinicalIndicesWithCreationDate = makeReleaseToCreationDate(clinicalIndicesAliased);
aliasedClinicalIndicesWithCreationDate.length
    ? console.table(aliasedClinicalIndicesWithCreationDate)
    : console.log('None');
