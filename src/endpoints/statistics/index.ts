import { Client } from '@elastic/elasticsearch';
import filesize from 'filesize';

import EsInstance from '../../ElasticSearchClientInstance';
import {
    esFileIndex,
    esParticipantIndex,
    esStudyIndex,
    esVariantIndex,
    familyIdKey,
    fileIdKey,
    participantIdKey,
    project,
    PROJECT_INCLUDE,
    PROJECT_KIDSFIRST,
    studyIdKey,
} from '../../env';
import { fetchBiospecimenStats as fetchIncludeBiospecimen } from './includeBiospecimen';
import { fetchBiospecimenStats as fetchKidsfirstBiospecimen } from './kidsfirstBiospecimen';

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
        index: esParticipantIndex,
        body: {
            aggs: { types_count: { value_count: { field: familyIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchBiospecimenStats = async (client: Client): Promise<number> => {
    if (project === PROJECT_KIDSFIRST) {
        return fetchKidsfirstBiospecimen(client);
    }

    if (project === PROJECT_INCLUDE) {
        return fetchIncludeBiospecimen(client);
    }

    return Promise.resolve(0);
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
    ]);

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
    };
};

export const getStudiesStatistics = async (): Promise<Record<string, unknown>> => {
    const client = EsInstance.getInstance();

    const { body } = await client.search({
        index: esStudyIndex,
        body: {
            size: 500,
            _source: ['participant_count', 'study_code'],
        },
    });

    return body.hits.hits.map(hit => hit._source);
};
