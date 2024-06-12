/**
(WIP) Helper script to find unused genomic indices
 * */
import assert from 'node:assert/strict';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const client = new Client({ node: esHost });

const catCentricIndicesResponse = await client.cat.indices({
    index: `*centric*`,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});

const catSuggestionsIndicesResponse = await client.cat.indices({
    index: `*suggestions*`,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});

if (catCentricIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catCentricIndicesResponse, ' Terminating.');
    process.exit(1);
}

if (catSuggestionsIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catSuggestionsIndicesResponse, ' Terminating.');
    process.exit(1);
}

const cbKeepGenomicIndicesOnly = x => ['variant', 'gene'].some(stem => x.index.includes(stem));

const genomicCentricIndices = catCentricIndicesResponse.body.filter(cbKeepGenomicIndicesOnly);
assert(Array.isArray(genomicCentricIndices) && genomicCentricIndices.length > 0, 'No index found. Terminating');

const genomicSuggestionsIndices = catSuggestionsIndicesResponse.body.filter(cbKeepGenomicIndicesOnly);
assert(Array.isArray(genomicSuggestionsIndices) && genomicSuggestionsIndices.length > 0, 'No index found. Terminating');

const genomicIndices = genomicCentricIndices.concat(genomicSuggestionsIndices);

const allAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});

const genomicAliases = allAliases.body.filter(cbKeepGenomicIndicesOnly);

const makeReleaseToCreationDate = l =>
    l
        .filter(x => x.index.includes('_re_'))
        .sort((a, b) => b['creation.date'] - a['creation.date'])
        .map(x => ['re_' + x.index.split('re_')[1], x['creation.date.string']])
        .reduce((xs, x) => (xs.some(y => y[0] === x[0]) ? xs : [...xs, x]), [])
        .map(x => ({ release: x[0], creation_date: x[1] }));

const genomicIndicesNotAliased = genomicIndices.filter(x => genomicAliases.every(a => a.index !== x.index));
const unaliasedGenomicIndicesWithCreationDate = makeReleaseToCreationDate(genomicIndicesNotAliased);
console.log(`===== Not Aliased`);

unaliasedGenomicIndicesWithCreationDate.length
    ? console.table(unaliasedGenomicIndicesWithCreationDate)
    : console.log('None');

console.log(`===== Aliased`);
const genomicIndicesAliased = genomicIndices.filter(x => genomicAliases.some(a => a.index === x.index));
const aliasedGenomicIndicesWithCreationDate = makeReleaseToCreationDate(genomicIndicesAliased);
aliasedGenomicIndicesWithCreationDate.length
    ? console.table(aliasedGenomicIndicesWithCreationDate)
    : console.log('None');
