import { buildQuery } from '@arranger/middleware';
import { get, isEmpty, uniq } from 'lodash';
import { SetSqon, Sort } from '../endpoints/sets/setsTypes';
import { getNestedFields } from './nestedField';
import EsInstance from './ElasticSearchClientInstance';

export const searchSqon = async (
    sqon: SetSqon,
    requestSort: Sort[],
    projectId: string,
    type: string,
    path: string,
): Promise<string[]> => {
    const { query, sort } = await makeQuery(sqon, requestSort, projectId, type);
    return executeQuery({
        index: `${type}_centric`,
        query,
        path: path,
        sort: sort && sort.length ? sort : [{ field: '_id', order: 'asc' }],
    });
};

const makeQuery = async (sqon: SetSqon, sort: Sort[], projectId: string, type: string) => {
    const nestedFields = await getNestedFields(projectId, `${type}_centric`);
    const query = buildQuery({ nestedFields, filters: sqon });
    return { query, sort };
};

const executeQuery = async ({
    index,
    query,
    path,
    sort,
    BULK_SIZE = 1000,
    trackTotalHits = true,
}): Promise<string[]> => {
    const search = async ({ searchAfter = null } = {}) => {
        const body = {
            ...(!isEmpty(query) && { query }),
            ...(searchAfter && { search_after: searchAfter }),
        };

        const client = EsInstance.getInstance();

        const response = await client.search({
            index,
            sort: sort.map(({ field, order }) => `${field}:${order || 'asc'}`),
            size: BULK_SIZE,
            track_total_hits: trackTotalHits,
            body,
        });

        const ids = response.body.hits.hits.map(x => get(x, `_source.${path.split('__').join('.')}`, x._id || ''));

        const nextSearchAfter: string[] = sort
            .map(({ field }) => response.body.hits.hits.map(x => x._source[field] || x[field]))
            .reduce((acc, vals) => [...acc, ...vals.slice(-1)], []);

        return {
            ids,
            searchAfter: nextSearchAfter,
            total: response.body.hits.total,
        };
    };
    const handleResult = async ({ searchAfter, total, ids = [] }) => {
        if (ids.length === total) return uniq(ids);
        const { ids: newIds, ...response } = await search({ searchAfter });
        return handleResult({ ...response, ids: [...ids, ...newIds] });
    };
    return handleResult(await search());
};
