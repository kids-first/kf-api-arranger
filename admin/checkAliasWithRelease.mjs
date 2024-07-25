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
const clinicalAliases = allAliases.filter(cbKeepClinicalIndicesOnly);

const aliasToReleases = clinicalAliases.reduce((xs, x) => {
    const r = 're' + x.index.split('_re_')[1];
    const v = [...new Set(xs[x.alias] ? [...xs[x.alias], r] : [r])];
    return {
        ...xs,
        [x.alias]: v,
        all: v,
    };
}, {});

const { all, ...entities } = aliasToReleases;
console.log(`\n`);

//not the best test but it should suffice
const ok = all.length <= 2;
if (!ok) {
    console.warn('Check if the clinical aliases are ok - There might be a problem');
}
console.log(`Release(s) found: ${all}`);
console.log(entities);
