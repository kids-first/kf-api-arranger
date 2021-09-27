import { get } from 'lodash';
import { AsyncCache } from '../cache/asyncCache';
import EsInstance from './ElasticSearchClientInstance';

const internalCache = new AsyncCache();

const generateCacheKey = (projectId: string, indexName: string): string => `${projectId} ${indexName}`;

/**
 * Get an arranger project's nestedFields.
 */
export const getNestedFields = async (projectId: string, indexName: string): Promise<string[]> => {
    const key: string = generateCacheKey(projectId, indexName);
    return internalCache.get(key, async () => await fetchNestedFields(projectId, indexName));
};

const fetchNestedFields = async (projectId: string, indexName: string): Promise<string[]> => {
    const key = generateCacheKey(projectId, indexName);
    const es = EsInstance.getInstance();
    const index = `arranger-projects-${projectId}`;
    const body = {
        query: {
            bool: {
                must: [
                    {
                        terms: {
                            index: [indexName],
                        },
                    },
                ],
            },
        },
    };

    const response = await es.search({ index, body });

    const hits = get(response, 'body.hits.hits', []);

    if (hits === []) {
        console.warn(`Could not find project for "projectId: ${projectId}, indexName: ${indexName}"`);
        internalCache.remove(key);
    }

    const extended = get(hits[0], '_source.config.extended', []);

    return extended.filter(({ type }) => type === 'nested').map(({ field }) => field);
};
