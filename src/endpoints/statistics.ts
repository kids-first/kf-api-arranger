import { buildAggregations, flattenAggregations } from '@arranger/middleware';
import filesize from 'filesize';
import { get, set } from 'lodash';

import EsInstance from '../ElasticSearchClientInstance';
import { esFileIndex } from '../env';

export type Statistics = {
    files: number;
    fileSize: string;
    studies: number;
    samples: number;
    families: number;
    participants: number;
};

const NESTED_FIELDS = ['participants', 'participants.biospecimens'];
const STATS = [
    {
        name: 'files',
        field: 'kf_id',
    },
    {
        name: 'fileSize',
        field: 'size',
        query: 'stats.sum',
        accessor: 'stats.sum',
        format: filesize,
    },
    {
        name: 'studies',
        field: 'participants.study.kf_id',
    },
    {
        name: 'samples',
        field: 'participants.biospecimens.kf_id',
    },
    {
        name: 'families',
        field: 'participants.family_id',
    },
    {
        name: 'participants',
        field: 'participants.kf_id',
    },
].map(x => ({
    query: 'buckets.key',
    accessor: 'buckets.length',
    format: x => x,
    ...x,
}));

const fetchAggregations = async ({ nestedFields, graphqlFields }) => {
    const client = await EsInstance.getInstance();
    const { body } = await client.search({
        index: esFileIndex,
        body: {
            aggs: buildAggregations({
                query: {},
                nestedFields,
                graphqlFields,
                aggregationsFilterThemselves: false,
            }),
        },
    });
    const aggregations = body.aggregations;
    return flattenAggregations({ aggregations, includeMissing: false });
};

export const getStatistics = async (): Promise<Statistics> => {
    const aggregations = await fetchAggregations({
        nestedFields: NESTED_FIELDS,
        graphqlFields: STATS.reduce(
            (obj, { field, query }) => ({
                ...obj,
                [field.split('.').join('__')]: set({}, query, {}),
            }),
            {},
        ),
    });

    return STATS.reduce(
        (obj, { name, field, format, accessor }) => ({
            ...obj,
            [name]: format(get(aggregations, [field, ...accessor.split('.')], 0)),
        }),
        {},
    ) as Statistics;
};
