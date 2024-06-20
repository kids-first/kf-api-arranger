import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import assert from 'node:assert/strict';
import { ENTITIES, getGlobalClinicalStats, getAllCountsPerStudy, studyIdToStudyCode } from './releaseStatsUtils.mjs';

const args = process.argv.slice(2);
const releaseArgument = args.find(a => a.startsWith('release:')) ?? '';
const release = releaseArgument.split('release:')[1];
assert(!!release, 'Missing release value');

const projectArgument = args.find(a => a.startsWith('project:')) ?? '';
const project = projectArgument.split('project:')[1]?.toLocaleLowerCase() || ``;

const isInclude = project.includes(`inc`);

const client = new Client({ node: esHost });

console.log(`===== Project inferred is ${isInclude ? 'INCLUDE' : 'KF'} =====`);
const globalStats = await getGlobalClinicalStats(client, release);
assert(!globalStats[0], globalStats[0]);
console.table(globalStats[1]);

const rStudyDict = await studyIdToStudyCode(client, release);
assert(!rStudyDict[0], rStudyDict[0]);
const studyDict = rStudyDict[1];

const rAllCounts = await getAllCountsPerStudy(client, release, studyDict);
assert(!rAllCounts[0], rAllCounts[0]);
const allCounts = rAllCounts[1];
console.table(allCounts);

const FIELD_DUPLICATE_SPECIMEN = isInclude ? `container_id` : 'fhir_id';
const BUCKET_SIZE_FOR_DUPES = 1;
const mSearchDuplicatesResponse = await client.msearch({
    body: [
        { index: `${ENTITIES.study_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: 'study_id',
                        size: BUCKET_SIZE_FOR_DUPES,
                        min_doc_count: 2,
                    },
                },
            },
        },
        { index: `${ENTITIES.participant_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: 'participant_id',
                        size: BUCKET_SIZE_FOR_DUPES,
                        min_doc_count: 2,
                    },
                },
            },
        },
        { index: `${ENTITIES.file_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: 'file_id',
                        size: 1,
                        min_doc_count: 2,
                    },
                },
            },
        },
        { index: `${ENTITIES.biospecimen_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: FIELD_DUPLICATE_SPECIMEN,
                        size: BUCKET_SIZE_FOR_DUPES,
                        min_doc_count: 2,
                    },
                },
            },
        },
    ],
});
const mResponsesForDuplicates = mSearchDuplicatesResponse?.body?.responses || [];
const duplicates = Object.fromEntries(
    [
        [ENTITIES.study_centric, undefined],
        [ENTITIES.participant_centric, undefined],
        [ENTITIES.file_centric, undefined],
        [ENTITIES.biospecimen_centric, undefined],
    ]
        .map((x, index) => {
            const key = x[0];
            const buckets = mResponsesForDuplicates[index].aggregations?.duplicates?.buckets || [];
            const hasDuplicates = buckets.length > 0;
            return [key, { duplicates: hasDuplicates }];
        })
        .sort((x, y) => {
            //ref: https://stackoverflow.com/questions/17387435/javascript-sort-array-of-objects-by-a-boolean-property
            // true values first
            if (x[1].duplicates === y[1].duplicates) {
                return 0;
            }
            return x[1].duplicates ? -1 : 1;
        }),
);
console.table(duplicates);
