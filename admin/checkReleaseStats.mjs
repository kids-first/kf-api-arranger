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

const verboseArgument = args.find(a => a.startsWith('verbose:')) ?? '';
const verbose = ['true', 'yes', 'y'].includes(verboseArgument.split('verbose:')[1]?.toLocaleLowerCase() || ``);

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
const mSearchDuplicatesResponse = await client.msearch({
    body: [
        { index: `${ENTITIES.study_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: 'study_id',
                        size: 100000,
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
                        size: 100000,
                        min_doc_count: 2,
                    },
                    aggs: {
                        study: {
                            terms: {
                                size: 100000,
                                field: 'study.study_id',
                            },
                        },
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
                        size: 100000,
                        min_doc_count: 2,
                    },
                    aggs: {
                        study: {
                            terms: {
                                size: 100000,
                                field: 'study.study_id',
                            },
                        },
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
                        size: 100000,
                        min_doc_count: 2,
                    },
                    aggs: {
                        study: {
                            terms: {
                                size: 100000,
                                field: 'study.study_id',
                            },
                        },
                    },
                },
            },
        },
    ],
});
const mResponsesForDuplicates = mSearchDuplicatesResponse?.body?.responses || [];
const bucketsOfDuplicates = (() => {
    const cbSubAggregation = ({ study, ...x }) => {
        const studyIds = [...new Set(study?.buckets?.map(b => b.key) || [])];
        return {
            ...x,
            study: studyIds.map(id => ({
                id,
                code: studyDict[id.toLowerCase()] || '--',
            })),
        };
    };
    return {
        [ENTITIES.study_centric]: mResponsesForDuplicates[0].aggregations?.duplicates?.buckets || [],
        [ENTITIES.participant_centric]: (mResponsesForDuplicates[1].aggregations?.duplicates?.buckets || []).map(
            cbSubAggregation,
        ),
        [ENTITIES.file_centric]: (mResponsesForDuplicates[2].aggregations?.duplicates?.buckets || []).map(
            cbSubAggregation,
        ),
        [ENTITIES.biospecimen_centric]: (mResponsesForDuplicates[3].aggregations?.duplicates?.buckets || []).map(
            cbSubAggregation,
        ),
    };
})();

const duplicatesEntries = Object.entries(bucketsOfDuplicates).filter(([, v]) => !!v && v.length > 0);
const duplicatesWithSummary = Object.fromEntries(
    duplicatesEntries.map(([k, v]) => [k, { total_duplicates: v.length }]),
);
console.table(duplicatesWithSummary);
if (verbose) {
    const duplicatesWithDetails = Object.fromEntries(duplicatesEntries);
    console.log(JSON.stringify(duplicatesWithDetails, null, 4));
}
