import { Client } from '@elastic/elasticsearch';
import filesize from 'filesize';

import EsInstance from '../ElasticSearchClientInstance';
import {
    biospecimenIdKey,
    esBiospecimenIndex,
    esFileIndex,
    esParticipantIndex,
    esStudyIndex,
    fileIdKey,
    keycloakRealm,
    participantIdKey,
    studyIdKey,
} from '../env';

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
                    aggs: { types_count: { value_count: { field: `biospecimens.${biospecimenIdKey}` } } },
                },
            },
        },
        size: 0,
    });
    return body.aggregations.list.doc_count;
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

const fetchSampleOrBiospecimenStats = async (client: Client): Promise<number> => {
    if (keycloakRealm === 'kidsfirstdrc') {
        return fetchSampleStats(client);
    }

    if (keycloakRealm === 'includedcc') {
        return fetchBiospecimenStats(client);
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
        fetchSampleOrBiospecimenStats(client),
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
