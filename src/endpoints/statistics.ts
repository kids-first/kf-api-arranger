import { Client } from '@elastic/elasticsearch';
import filesize from 'filesize';

import EsInstance from '../ElasticSearchClientInstance';
import { esFileIndex, esParticipantIndex, esStudyIndex, idKey } from '../env';

export type Statistics = {
    files: number;
    fileSize: string;
    studies: number;
    samples: number;
    families: number;
    participants: number;
};

const fetchFileStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esFileIndex,
        body: {
            aggs: { types_count: { value_count: { field: idKey } } },
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
            aggs: { types_count: { value_count: { field: idKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchParticipantStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esParticipantIndex,
        body: {
            aggs: { types_count: { value_count: { field: idKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchFamilyStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esParticipantIndex,
        body: {
            aggs: { types_count: { value_count: { field: 'family_id' } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};

const fetchSampleStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esParticipantIndex,
        body: {
            aggs: {
                list: {
                    nested: { path: 'biospecimens' },
                    aggs: { types_count: { value_count: { field: `biospecimens.${idKey}` } } },
                },
            },
        },
        size: 0,
    });
    return body.aggregations.list.doc_count;
};

export const getStatistics = async (): Promise<Statistics> => {
    const client = EsInstance.getInstance();
    const result = await Promise.all([
        fetchFileStats(client),
        fetchStudyStats(client),
        fetchParticipantStats(client),
        fetchFamilyStats(client),
        fetchSampleStats(client),
        fetchFileSizeStats(client),
    ]);

    return {
        files: result[0],
        studies: result[1],
        participants: result[2],
        families: result[3],
        samples: result[4],
        fileSize: result[5],
    } as Statistics;
};
