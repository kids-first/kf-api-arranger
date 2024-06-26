export const ENTITIES = {
    study_centric: 'study_centric',
    participant_centric: 'participant_centric',
    file_centric: 'file_centric',
    biospecimen_centric: 'biospecimen_centric',
};

export const getGlobalClinicalStats = async (client, re) => {
    const entitiesOrder = [
        ENTITIES.study_centric,
        ENTITIES.participant_centric,
        ENTITIES.file_centric,
        ENTITIES.biospecimen_centric,
    ];
    const mSearchesGlobalResponse = await client.msearch({
        body: [
            { index: `${entitiesOrder[0]}*${re}*` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
            { index: `${entitiesOrder[1]}*${re}*` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
            { index: `${entitiesOrder[2]}*${re}*` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
            { index: `${entitiesOrder[3]}*${re}*` },
            { query: { match_all: {} }, size: 0, track_total_hits: true },
        ],
    });

    const responses = mSearchesGlobalResponse?.body?.responses || [];
    if (!responses.every(r => r.status === 200)) {
        return ['got problematic statuses while doing a multiple search', undefined];
    }
    return [
        undefined,
        (responses || []).reduce(
            (xs, x, index) => ({
                ...xs,
                [entitiesOrder[index]]: { total: x.hits.total.value, release: re },
            }),
            {},
        ),
    ];
};

export const studiesStats = async (client, re, indices, studyToId) => {
    const studies = [...new Set(indices.map(x => x.index.split('centric_')[1]))];

    const rAllCounts = await client.msearch({
        body: studies
            .sort()
            .map(x => [
                { index: `${ENTITIES.study_centric}_${x}` },
                { _source: '', query: { match_all: {} }, size: 1, track_total_hits: true },
                { index: `${ENTITIES.participant_centric}_${x}` },
                { _source: '', query: { match_all: {} }, size: 1, track_total_hits: true },
                { index: `${ENTITIES.file_centric}_${x}` },
                { _source: '', query: { match_all: {} }, size: 1, track_total_hits: true },
                { index: `${ENTITIES.biospecimen_centric}_${x}` },
                { _source: '', query: { match_all: {} }, size: 1, track_total_hits: true },
            ])
            .flat(),
    });

    // 404: an index that does not exist. For instance, a given study with no files.
    const responses = rAllCounts?.body?.responses || [];
    if (responses.some(r => ![200, 404].includes(r.status))) {
        return ['got unsupported status(es) while doing a multiple search for stats', undefined];
    }

    const allCounts = responses.reduce((xs, x) => {
        const is404 = x.status === 404;
        const indexName = is404 ? x.error.index : x.hits.hits[0]._index;
        const entity = `${indexName.split('centric_')[0]}centric`;
        const studyId = indexName.replace(`_${re}`, '').split('centric_')[1];
        return {
            ...xs,
            [studyId]: {
                ...(xs[studyId] || {}),
                [entity]: x?.hits?.total?.value || 'N/A',
                release: re,
                code: studyToId[studyId],
            },
        };
    }, {});
    return [undefined, allCounts];
};

export const clinicalIndexStems = ['file', 'participant', 'study', 'biospecimen'];
export const isClinicalIndex = index => !!index && clinicalIndexStems.some(x => index.startsWith(x));

export const studyIdToStudyCode = async (client, re) => {
    const allStudiesSearchResponse = await client.search({
        index: `${ENTITIES.study_centric}*${re}*`,
        body: {
            _source: ['study_id', 'study_code'],
            size: 1000,
        },
    });

    const allStudiesHits = allStudiesSearchResponse?.body?.hits?.hits || [];
    if (allStudiesSearchResponse.statusCode !== 200 || allStudiesHits.length === 0) {
        return ['Studies are expected but did not received any', undefined];
    }
    return [
        undefined,
        allStudiesHits.reduce((xs, x) => {
            const id = x._source.study_id.toLowerCase();
            const code = x._source.study_code;
            return {
                ...xs,
                [id]: code,
            };
        }, {}),
    ];
};

export const getAllCountsPerStudy = async (client, re, studyDict) => {
    const catIndicesResponse = await client.cat.indices({
        index: `*_${re}`,
        h: 'index',
        format: 'json',
    });
    if (catIndicesResponse.statusCode !== 200) {
        return ['Could not retrieve all indices correctly', undefined];
    }
    const allIndices = catIndicesResponse.body.filter(x => isClinicalIndex(x.index));
    if (allIndices.length === 0) {
        return [`No found data for release=${re}`, undefined];
    }

    return await studiesStats(client, re, allIndices, studyDict);
};
