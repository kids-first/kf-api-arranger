import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const releaseArgument = args.find(a => a.startsWith('release:')) ?? '';
const release = releaseArgument.split('release:')[1];
assert(!!release, 'Missing release value');

const ENTITIES = {
    study_centric: 'study_centric',
    participant_centric: 'participant_centric',
    file_centric: 'file_centric',
    biospecimen_centric: 'biospecimen_centric',
};
const N_OF_ENTITIES_CENTERS = Object.keys(ENTITIES).length;

const client = new Client({ node: esHost });

const mSearchesGlobalResponse = await client.msearch({
    body: [
        { index: `${ENTITIES.study_centric}*${release}*` },
        { query: { match_all: {} }, size: 0, track_total_hits: true },
        { index: `${ENTITIES.participant_centric}*${release}*` },
        { query: { match_all: {} }, size: 0, track_total_hits: true },
        { index: `${ENTITIES.file_centric}*${release}*` },
        { query: { match_all: {} }, size: 0, track_total_hits: true },
        { index: `${ENTITIES.biospecimen_centric}*${release}*` },
        { query: { match_all: {} }, size: 0, track_total_hits: true },
    ],
});
const mResponses = mSearchesGlobalResponse?.body?.responses || [];
assert(mResponses.length === N_OF_ENTITIES_CENTERS, `Did not received the expected global search results.`);

const totalGlobalHits = mResponses.map(x => x.hits.total.value);

const globalStats = ['Total studies: ', 'Total participants: ', 'Total files: ', 'Total biospecimens: '].map(
    (x, index) => x + totalGlobalHits[index],
);

const title = ` Clinical Stats (${release})`;
const divider = [...title].map(_ => '_').join('');
console.log(divider);
console.log(title);
console.log(divider);
console.log(globalStats.join('\n'));

const catIndicesResponse = await client.cat.indices({
    index: `*_${release}`,
    h: 'index',
    format: 'json',
});

assert(catIndicesResponse.statusCode === 200, 'Could not retrieve all indices correctly');
const allIndices = catIndicesResponse.body;
if (allIndices.length % N_OF_ENTITIES_CENTERS !== 0) {
    const extractStudyIdWithoutReleaseSuffix = w => 'sd' + w.split('_sd')[1].split('_re')[0];
    const fn = suffix =>
        allIndices.filter(x => x.index.includes(suffix)).map(x => extractStudyIdWithoutReleaseSuffix(x.index)).sort();
    const allSpecimensIndices = fn('biospecimen_centric');
    const allStudiesIndices = fn('study_centric');
    const allParticipantsIndices = fn('participant_centric');
    const allFilesIndices = fn('file_centric');

    const allFound = [
        ...new Set([...allSpecimensIndices, ...allStudiesIndices, ...allParticipantsIndices, ...allFilesIndices]),
    ];

    const missingFn = l => allFound.filter(x => !l.includes(x)).sort();
    const details = {
        specimens: {
            l: allSpecimensIndices,
            count: allSpecimensIndices.length,
            missing: missingFn(allSpecimensIndices),
        },
        studies: {
            l: allStudiesIndices,
            count: allStudiesIndices.length,
            missing: missingFn(allStudiesIndices),
        },
        participants: {
            l: allParticipantsIndices,
            count: allParticipantsIndices.length,
            missing: missingFn(allParticipantsIndices),
        },
        files: {
            l: allFilesIndices,
            count: allFilesIndices.length,
            missing: missingFn(allFilesIndices),
        },
    };
    console.warn(
        `Did not received the expected number of indices (must be a multiple of ${N_OF_ENTITIES_CENTERS}). Got total of: ${allIndices.length}`,
    );
    console.warn('Details:', details);
    process.exit(0);
}

const allStudiesSearchResponse = await client.search({
    index: `${ENTITIES.study_centric}*${release}*`,
    body: {
        _source: ['study_id', 'study_code'],
        size: 1000,
    },
});

const allStudiesHits = allStudiesSearchResponse?.body?.hits?.hits || [];
assert(allStudiesHits.length > 0, 'Studies are expected');

const studyIdToStudyCode = allStudiesHits.reduce((xs, x) => {
    const source = x._source;
    return {
        ...xs,
        [source.study_id.toLowerCase()]: source.study_code,
    };
}, {});

const PREFIX = 0;
const SUFFIX = 1;

const removeReleaseSuffix = word => word.split('_re_')[PREFIX];

const studyIdsWithReleaseSuffix = [...new Set(allIndices.map(x => `sd_${x.index.split('_sd_')[SUFFIX]}`))].sort();

const mSearchesAllResponse = await client.msearch({
    body: studyIdsWithReleaseSuffix
        .map(x => [
            { index: `${ENTITIES.participant_centric}_${x}` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
            { index: `${ENTITIES.file_centric}_${x}` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
            { index: `${ENTITIES.biospecimen_centric}_${x}` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
        ])
        .flat(),
});
const mResponsesForAllStudies = mSearchesAllResponse?.body?.responses || [];

const N_OF_ENTITIES_CENTERS_MINUS_STUDY = N_OF_ENTITIES_CENTERS - 1;
assert(
    mResponsesForAllStudies.length % N_OF_ENTITIES_CENTERS_MINUS_STUDY === 0,
    'Did not received the expected search results for all studies',
);

const messagesPlaceholdersByStudy = studyIdsWithReleaseSuffix
    .map((x, index) => {
        const studyId = removeReleaseSuffix(x);
        const studyCode = studyIdToStudyCode[studyId];
        const delimiter = index % 2 === 0 ? '-' : '*';
        return [
            `${delimiter}Participants (${studyId} ; ${studyCode}): `,
            `${delimiter}Files (${studyId} ; ${studyCode}): `,
            `${delimiter}Biospecimens (${studyId} ; ${studyCode}): `,
        ];
    })
    .flat();
const totalHitsByStudies = mResponsesForAllStudies.map(x => x.hits.total.value);
console.log(divider);
console.log(messagesPlaceholdersByStudy.map((x, index) => x + totalHitsByStudies[index]).join('\n'));

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
                },
            },
        },
        { index: `${ENTITIES.biospecimen_centric}*${release}*` },
        {
            size: 0,
            aggs: {
                duplicates: {
                    terms: {
                        field: 'fhir_id',
                        size: 100000,
                        min_doc_count: 2,
                    },
                },
            },
        },
    ],
});

const mResponsesForDuplicates = mSearchDuplicatesResponse?.body?.responses || [];

assert(
    mResponsesForDuplicates.length % N_OF_ENTITIES_CENTERS === 0,
    'Did not received the expected search results for duplicates',
);

const bucketsOfDuplicates = {
    [ENTITIES.study_centric]: mResponsesForDuplicates[0].aggregations.duplicates.buckets || [],
    [ENTITIES.participant_centric]: mResponsesForDuplicates[1].aggregations.duplicates.buckets || [],
    [ENTITIES.file_centric]: mResponsesForDuplicates[2].aggregations.duplicates.buckets || [],
    [ENTITIES.biospecimen_centric]: mResponsesForDuplicates[3].aggregations.duplicates.buckets || [],
};

const messagesForDuplicates = Object.entries(bucketsOfDuplicates).reduce((xs, [center, buckets]) => {
    const nOfDuplicates = buckets.length;
    if (nOfDuplicates === 0) {
        return xs;
    }
    const showDetailOnlyForParticipants =
        center === ENTITIES.participant_centric
            ? buckets.map(
                b =>
                    `(${b.doc_count}) ${b.key.toLowerCase()} ${b.study.buckets
                        .map(sb => `(${sb.key.toLowerCase()}; ${studyIdToStudyCode[sb.key.toLowerCase()]})`)
                        .join(' - ')}`,
            )
            : [];

    return [...xs, `\nFound ${nOfDuplicates} duplicates in ${center}`, ...showDetailOnlyForParticipants];
}, []);

console.log(messagesForDuplicates.join('\n'));

const searchResponseSpecimensDuplicates = await client.search({
    index: `${ENTITIES.biospecimen_centric}*${release}*`,
    body: {
        size: 0,
        track_total_hits: true,
        aggs: {
            duplicates: {
                terms: {
                    field: 'fhir_id',
                    size: 100000,
                    min_doc_count: 2,
                },
                aggs: {
                    study: {
                        terms: {
                            field: 'study.study_id',
                        },
                    },
                },
            },
        },
    },
});

const specimenBucketsWithStudyInfo = searchResponseSpecimensDuplicates?.body?.aggregations?.duplicates?.buckets || [];
const sIdToStudyID = specimenBucketsWithStudyInfo.map(b => [b.key, ...b.study.buckets.map(sb => sb.key.toLowerCase())]);

if (sIdToStudyID.length > 0) {
    assert(
        sIdToStudyID.every(s => s.length === 2),
        `Multiple specimen ids found for different studies`,
    );
}

const studyToSpecimensIds = sIdToStudyID.reduce((xs, x) => {
    const fhirId = x[0];
    const studyId = x[1];
    return {
        ...xs,
        [studyId]: [...new Set([fhirId, ...(xs[studyId] || [])])].sort(),
    };
}, {});

console.log(studyToSpecimensIds);
