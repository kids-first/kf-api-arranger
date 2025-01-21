import { Client } from '@elastic/elasticsearch';
import filesize from 'filesize';

import EsInstance from '../../ElasticSearchClientInstance';
import { esBiospecimenIndex, esFileIndex, esParticipantIndex, esStudyIndex, esVariantIndex } from '../../esUtils';
import { biospecimenIdKey, familyCountKey, fileIdKey, participantIdKey, studyIdKey } from '../../fieldsKeys';
import { isInclude } from '../../projectUtils';

export type Diagnosis = {
    mondo_id: string;
    count: number;
};

export type Statistics = {
    files: number;
    fileSize: string;
    studies: number;
    samples: number;
    families: number;
    participants: number;
    variants: number;
    genomes: number;
    transcriptomes: number;
    sex: Record<string, number>;
    downSyndromeStatus: Record<string, number>;
    race: Record<string, number>;
    ethnicity: Record<string, number>;
    diagnosis: Diagnosis[];
};

const fetchFileStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esFileIndex,
        body: {
            aggs: { types_count: { value_count: { field: fileIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchFileSizeStats = async (client: Client): Promise<string> => {
    const { body } = await client.search({
        index: esFileIndex,
        body: {
            aggs: { types_count: { sum: { field: 'size' } } },
        },
        size: 0,
    });
    return filesize(body.aggregations.types_count.value);
};

const fetchStudyStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esStudyIndex,
        body: {
            aggs: { types_count: { value_count: { field: studyIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchParticipantStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esParticipantIndex,
        body: {
            aggs: { types_count: { value_count: { field: participantIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchFamilyStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esStudyIndex,
        body: {
            aggs: { types_count: { sum: { field: familyCountKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchBiospecimenStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esBiospecimenIndex,
        body: {
            aggs: { types_count: { value_count: { field: biospecimenIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

export const fetchVariantStats = async (client: Client): Promise<number> => {
    const { body } = await client.count({
        index: esVariantIndex,
    });
    return body?.count;
};

export const fetchGenomesStats = async (client: Client): Promise<number> => {
    const { body } = await client.count({
        index: esParticipantIndex,
        body: {
            query: {
                bool: {
                    must: [
                        {
                            nested: {
                                path: 'files',
                                query: {
                                    term: {
                                        'files.file_format': 'cram',
                                    },
                                },
                            },
                        },
                        {
                            bool: {
                                should: [
                                    {
                                        nested: {
                                            path: 'files.sequencing_experiment',
                                            query: {
                                                term: {
                                                    'files.sequencing_experiment.experiment_strategy':
                                                        'Whole Genome Sequencing',
                                                },
                                            },
                                        },
                                    },
                                    {
                                        nested: {
                                            path: 'files.sequencing_experiment',
                                            query: {
                                                term: {
                                                    'files.sequencing_experiment.experiment_strategy': 'WGS',
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        },
    });

    return body?.count;
};

export const fetchTranscriptomesStats = async (client: Client): Promise<number> => {
    const { body } = await client.count({
        index: esParticipantIndex,
        body: {
            query: {
                bool: {
                    must: [
                        {
                            nested: {
                                path: 'files.sequencing_experiment',
                                query: {
                                    term: {
                                        'files.sequencing_experiment.experiment_strategy': 'RNA-Seq',
                                    },
                                },
                            },
                        },
                        {
                            bool: {
                                should: [
                                    {
                                        nested: {
                                            path: 'files',
                                            query: {
                                                term: {
                                                    'files.file_format': 'cram',
                                                },
                                            },
                                        },
                                    },
                                    {
                                        nested: {
                                            path: 'files',
                                            query: {
                                                term: {
                                                    'files.file_format': 'fastq',
                                                },
                                            },
                                        },
                                    },
                                    {
                                        nested: {
                                            path: 'files',
                                            query: {
                                                term: {
                                                    'files.file_format': 'bam',
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        },
    });

    return body?.count;
};

export const fetchDemographicsStats = async (client: Client): Promise<Record<string, number>[]> => {
    const response = await client.msearch({
        body: [
            { index: esParticipantIndex },
            { size: 0, aggs: { sex: { terms: { field: 'sex', size: 10 } } } },
            { index: esParticipantIndex },
            { size: 0, aggs: { down_syndrome_status: { terms: { field: 'down_syndrome_status', size: 10 } } } },
            { index: esParticipantIndex },
            { size: 0, aggs: { race: { terms: { field: 'race', size: 20 } } } },
            { index: esParticipantIndex },
            { size: 0, aggs: { ethnicity: { terms: { field: 'ethnicity', size: 20 } } } },
        ],
    });

    const sex = response.body.responses[0].aggregations.sex.buckets.reduce((acc, curr) => {
        acc[curr.key] = curr.doc_count;
        return acc;
    }, {});
    const downSyndromeStatus = response.body.responses[1].aggregations.down_syndrome_status.buckets.reduce(
        (acc, curr) => {
            acc[curr.key] = curr.doc_count;
            return acc;
        },
        {},
    );
    const race = response.body.responses[2].aggregations.race.buckets.reduce((acc, curr) => {
        acc[curr.key] = curr.doc_count;
        return acc;
    }, {});

    const ethnicity = response.body.responses[3].aggregations.ethnicity.buckets.reduce((acc, curr) => {
        acc[curr.key] = curr.doc_count;
        return acc;
    }, {});

    return [sex, downSyndromeStatus, race, ethnicity];
};

export const fetchTopDiagnosis = async (client: Client): Promise<Diagnosis[]> => {
    const excludeDownSyndrom = '.*MONDO:(0700030|0008608|0700129|0700127|0700130|0700128|0700126).*';

    const groupByDiagnosisTerms = {
        field: 'diagnosis.mondo_display_term',
        size: 1000,
    };

    const groupByDiagnosisTermsWithExcludeDownSyndrom = {
        ...groupByDiagnosisTerms,
        exclude: excludeDownSyndrom,
    };

    const response = await client.search({
        index: esParticipantIndex,
        body: {
            size: 0,
            aggs: {
                nested_diagnosis: {
                    nested: {
                        path: 'diagnosis',
                    },
                    aggs: {
                        group_by_diagnosis: {
                            terms: isInclude ? groupByDiagnosisTermsWithExcludeDownSyndrom : groupByDiagnosisTerms,
                            aggs: {
                                distinct_participant: {
                                    reverse_nested: {},
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    return response.body.aggregations.nested_diagnosis.group_by_diagnosis.buckets
        .map(bucket => ({
            mondo_id: bucket.key,
            count: bucket.distinct_participant.doc_count,
        }))
        .sort((a: Diagnosis, b: Diagnosis) => b.count - a.count)
        .slice(0, 10);
};

export const getStatistics = async (): Promise<Statistics> => {
    const client = EsInstance.getInstance();
    const results = await Promise.all([
        fetchFileStats(client),
        fetchStudyStats(client),
        fetchParticipantStats(client),
        fetchBiospecimenStats(client),
        fetchFamilyStats(client),
        fetchFileSizeStats(client),
        fetchVariantStats(client),
        fetchGenomesStats(client),
        fetchTranscriptomesStats(client),
        fetchDemographicsStats(client),
    ]);

    const diagnosis = await fetchTopDiagnosis(client);

    return {
        files: results[0],
        studies: results[1],
        participants: results[2],
        samples: results[3],
        families: results[4],
        fileSize: results[5],
        variants: results[6],
        genomes: results[7],
        transcriptomes: results[8],
        sex: results[9][0],
        downSyndromeStatus: results[9][1],
        race: results[9][2],
        ethnicity: results[9][3],
        diagnosis,
    };
};

export const getStudiesStatistics = async (): Promise<Record<string, unknown>> => {
    const client = EsInstance.getInstance();

    const { body } = await client.search({
        index: esStudyIndex,
        body: {
            size: 500,
            _source: [
                'data_category',
                'description',
                'domain',
                'domains',
                'external_id',
                'external_ids',
                'family_count',
                'file_count',
                'guid',
                'is_guid_mapped',
                'is_harmonized',
                'participant_count',
                'program',
                'study_code',
                'study_name',
                'study_id',
            ],
        },
    });

    return body.hits.hits.map(hit => hit._source);
};
