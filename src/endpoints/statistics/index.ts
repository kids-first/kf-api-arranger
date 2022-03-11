import { Client } from '@elastic/elasticsearch';
import filesize from 'filesize';

import EsInstance from '../../ElasticSearchClientInstance';
import {
    esFileIndex,
    esParticipantIndex,
    esStudyIndex, familyIdKey,
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

export const getStatistics = async (): Promise<Statistics> => {
    const client = EsInstance.getInstance();
    const result = await Promise.all([
        fetchFileStats(client),
        fetchStudyStats(client),
        fetchParticipantStats(client),
        fetchFamilyStats(client),
        fetchBiospecimenStats(client),
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
