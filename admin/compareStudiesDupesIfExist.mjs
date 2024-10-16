import { Client } from '@elastic/elasticsearch';
import { diffString } from 'json-diff';
import assert from 'node:assert/strict';

import { esHost } from '../dist/src/env.js';
import { ENTITIES } from './releaseStatsUtils.mjs';
import { binomialCoefficient, pairIt } from './utils.mjs';

const client = new Client({ node: esHost });

const STUDY_SEARCH_SIZE = 50;
const allStudiesSearchResponse = await client.search({
    index: `${ENTITIES.study_centric}`,
    track_total_hits: true,
    body: {
        size: STUDY_SEARCH_SIZE,
    },
});

const total = allStudiesSearchResponse.body.hits.total.value;
assert(total > 0, 'No study found');
assert(total < STUDY_SEARCH_SIZE, 'Not all studies were fetched, increase size in the script if needed');

const all = allStudiesSearchResponse.body.hits.hits;

const dupes = all
    .reduce((xs, x) => {
        if (all.filter(s => x._index === s._index).length > 1) {
            return [...xs, { ...x, studyCode: x._source.study_code }];
        }
        return xs;
    }, [])
    .reduce((xs, x) => {
        const studyCode = x.studyCode;
        return {
            ...xs,
            [studyCode]: xs[studyCode] ? [...xs[studyCode], x] : [x],
        };
    }, {});

const numberComparisons = Object.entries(dupes).reduce((xs, x) => {
    const n = x[1].length;
    return xs + binomialCoefficient(n, 2);
}, 0);

const MAX_N_OF_COMPARISONS = 25; // Arbitrary value, need real-world testing.
const willNotExplode = numberComparisons <= MAX_N_OF_COMPARISONS;

assert(willNotExplode, `Avoiding to compare for there are ${numberComparisons} comparisons to compute`);

const allPairs = Object.fromEntries(Object.entries(dupes).map(x => [x[0], pairIt(x[1])]));

Object.entries(allPairs).forEach(([code, pairs]) => {
    console.log(`----- Showing diff for duplicates of ${code} (total of ${pairs.length} pairs) -----`);
    pairs.forEach((p, index) => {
        const left = p[0];
        const right = p[1];
        console.log(`pair #${index + 1} : ${left._id} vs ${right._id}`);
        const diff = diffString(left, right, { sort: true });
        console.log(diff ? diff : `no diff found in this docs pair`);
    });
});
