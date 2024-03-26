import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import assert from 'node:assert/strict';

const cbKeepClinicalIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study'].some(stem => x.index.includes(stem));

const client = new Client({ node: esHost });

const rAllAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});

assert(rAllAliases.statusCode === 200);

const allAliases = rAllAliases.body;
const hasNext = allAliases.some(x => x.alias.includes('next_'));
const clinicalAliases = allAliases
    .filter(cbKeepClinicalIndicesOnly)
    .filter(x => (hasNext ? x.alias.includes('next_') : x));

const aliasToReleases = clinicalAliases.reduce((xs, x) => {
    const r = 're' + x.index.split('_re_')[1];
    return {
        ...xs,
        [x.alias]: [...new Set(xs[x.alias] ? [...xs[x.alias], r] : [r])],
    };
}, {});

console.log(aliasToReleases);

