import assert from 'node:assert/strict';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const client = new Client({ node: esHost });

const r = await client.indices.getMapping({ index: '*_centric_*' });
assert(r.statusCode === 200 && !!r.body);

const indicesWithMappingContainingIgnoreAbove = Object.entries(r.body)
    .map(([k, v]) => [k, v.mappings.properties])
    .reduce((xs, x) => {
        const [indexName, m] = x;
        const sm = JSON.stringify(m);
        const matchesStartPos = [...sm.matchAll(/ignore_above/g)].map(x => x.index);
        if (matchesStartPos.length === 0) {
            return xs;
        }
        const radiusInChars = 75;
        return [
            ...xs,
            { index: indexName, loci: matchesStartPos.map(n => sm.slice(n - radiusInChars, n + radiusInChars)) },
        ];
    }, []);

console.log(`==> Inspection for all centric mappings from: ${esHost}`);
if (indicesWithMappingContainingIgnoreAbove.length === 0) {
    console.log('No ignore_above found in any mappings for entity');
} else {
    console.table(indicesWithMappingContainingIgnoreAbove);
}
