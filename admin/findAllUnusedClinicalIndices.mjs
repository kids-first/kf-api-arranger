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

const clinicalIndicesNotAliased = clinicalIndices.filter(x => {
    return clinicalAliases.every(a => a.index !== x.index);
});
const unaliasedClinicalIndicesWithCreationDate = clinicalIndicesNotAliased
    .filter(x => x.index.includes('_re_'))
    .sort((a, b) => b['creation.date'] - a['creation.date'])
    .map(x => ['re_' + x.index.split('re_')[1], x['creation.date.string']])
    .reduce((xs, x) => {
        return xs.some(y => y[0] === x[0]) ? xs : [...xs, x];
    }, []);
console.log(unaliasedClinicalIndicesWithCreationDate);
const clinicalReleasesNotAliased = unaliasedClinicalIndicesWithCreationDate.map(x => x[0]).join(', ');
console.log(clinicalReleasesNotAliased);

console.log(`===== Aliased`)

const clinicalIndicesAliased = clinicalIndices.filter(x => {
    return clinicalAliases.some(a => a.index === x.index);
});
const aliasedClinicalIndicesWithCreationDate = clinicalIndicesAliased
    .filter(x => x.index.includes('_re_'))
    .sort((a, b) => b['creation.date'] - a['creation.date'])
    .map(x => ['re_' + x.index.split('re_')[1], x['creation.date.string']])
    .reduce((xs, x) => {
        return xs.some(y => y[0] === x[0]) ? xs : [...xs, x];
    }, []);

console.log(aliasedClinicalIndicesWithCreationDate);
const clinicalReleasesAliased = aliasedClinicalIndicesWithCreationDate.map(x => x[0]).join(', ');
console.log(clinicalReleasesAliased)