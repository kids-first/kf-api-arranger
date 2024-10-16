// example:  node admin/compare2Docs.mjs --a:9tCMkJIB0zu1NPYlGUy3 --b:_NCMkJIB0zu1NPYlGUy3 --entity:participant_centric
import { Client } from '@elastic/elasticsearch';
import { diffString } from 'json-diff';
import assert from 'node:assert/strict';

import { esHost } from '../dist/src/env.js';
import { ENTITIES } from './releaseStatsUtils.mjs';

const args = process.argv.slice(2);
const aArgument = args.find(x => x.startsWith('--a:')) ?? '';
const a = aArgument.split('--a:')[1];
const bArgument = args.find(x => x.startsWith('--b:')) ?? '';
const b = bArgument.split('--b:')[1];

const entityArgument = args.find(x => x.startsWith('--entity:')) ?? '';
const entity = entityArgument.split('--entity:')[1] || 'study_centric';
assert(!!a && !!b, 'Missing docs values');
assert(a !== b, 'a and b have the same value. Nothing to compare');
assert(
    Object.values(ENTITIES).some(x => x === entity),
    'Entity invalid',
);

const client = new Client({ node: esHost });

const resp = await client.search({
    index: `${entity}*`,
    body: {
        query: {
            ids: {
                values: [a, b],
            },
        },
    },
});

const left = resp.body.hits.hits[0];
const right = resp.body.hits.hits[1];

assert(left && right, 'Could not find at least one the 2 docs');
assert(left._index.startsWith(right._index.split('_centric')[0]), 'Docs seem to be from different entities.');

console.log(diffString(left, right, { sort: true }));
