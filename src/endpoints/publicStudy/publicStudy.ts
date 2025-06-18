import EsInstance from '../../ElasticSearchClientInstance';

type RData = {
    [index: string]: any;
};

export const getPublicStudy = async (code: string): Promise<RData> => {
    const client = EsInstance.getInstance();
    const r = await client.search({
        index: `study_centric`,
        body: {
            size: 1,
            query: {
                bool: {
                    must: [
                        {
                            term: {
                                study_code: {
                                    value: code,
                                },
                            },
                        },
                    ],
                },
            },
        },
    });
    return r.body.hits?.hits?.map(x => x._source)?.[0];
};

export const getPublicGraphs = async (code: string): Promise<RData> => {
    const client = EsInstance.getInstance();
    const MAX_AGG_TERMS_SIZE = 10000;
    const mr = await client.msearch({
        body: [
            { index: `participant_centric` },
            {
                query: {
                    bool: {
                        must: [
                            {
                                term: {
                                    'study.study_code': {
                                        value: code,
                                    },
                                },
                            },
                        ],
                    },
                },
                track_total_hits: true,
                size: 0,
                aggs: {
                    sex: {
                        terms: {
                            field: 'sex',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                    ethnicity: {
                        terms: {
                            field: 'ethnicity',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                    race: {
                        terms: {
                            field: 'race',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                    down_syndrome_status: {
                        terms: {
                            field: 'down_syndrome_status',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                    files: {
                        nested: {
                            path: 'files',
                        },
                        aggs: {
                            data_category: {
                                terms: {
                                    field: 'files.data_category',
                                    size: MAX_AGG_TERMS_SIZE,
                                },
                                aggs: {
                                    participants: {
                                        reverse_nested: {},
                                    },
                                },
                            },
                            data_type: {
                                terms: {
                                    field: 'files.data_type',
                                    size: MAX_AGG_TERMS_SIZE,
                                },
                                aggs: {
                                    participants: {
                                        reverse_nested: {},
                                    },
                                },
                            },
                        },
                    },
                },
            },
            { index: `biospecimen_centric` },
            {
                query: {
                    bool: {
                        must: [
                            {
                                term: {
                                    'study.study_code': {
                                        value: code,
                                    },
                                },
                            },
                        ],
                    },
                },
                track_total_hits: true,
                size: 0,
                aggs: {
                    sample_type: {
                        terms: {
                            field: 'sample_type',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                    status: {
                        terms: {
                            field: 'status',
                            size: MAX_AGG_TERMS_SIZE,
                        },
                    },
                },
            },
        ],
    });

    const rs = mr.body?.responses || [];
    const participantsAggsData = rs[0];
    const biospecimensAggsData = rs[1];

    const flattenReversedCount = (
        buckets: { key: string; doc_count: number; participants: { key: string; doc_count: number } }[],
    ) =>
        buckets.map(b => ({
            key: b.key,
            doc_count: b.participants.doc_count,
        }));

    return {
        participant_centric: {
            total: participantsAggsData.hits.total.value,
            data: {
                race: participantsAggsData.aggregations.race.buckets,
                ethnicity: participantsAggsData.aggregations.ethnicity.buckets,
                down_syndrome_status: participantsAggsData.aggregations.down_syndrome_status.buckets,
                sex: participantsAggsData.aggregations.sex.buckets,
                files_data_category: flattenReversedCount(
                    participantsAggsData.aggregations.files.data_category.buckets,
                ),
                files_data_type: flattenReversedCount(participantsAggsData.aggregations.files.data_type.buckets),
            },
        },
        biospecimens_centric: {
            total: biospecimensAggsData.hits.total.value,
            data: {
                sample_type: biospecimensAggsData.aggregations.sample_type.buckets,
                status: biospecimensAggsData.aggregations.status.buckets,
            },
        },
    };
};
