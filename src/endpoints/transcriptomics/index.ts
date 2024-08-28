import EsInstance from '../../ElasticSearchClientInstance';
import { esDiffGeneExp } from '../../esUtils';
import { DiffGeneExpPoint, DiffGeneExpVolcano, FetchDiffGeneExpResponse } from './types';

export const fetchDiffGeneExp = async (): Promise<DiffGeneExpVolcano[]> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esDiffGeneExp,
        body: {
            aggs: {
                by_category: {
                    terms: {
                        field: 'category',
                        size: 3,
                    },
                    aggs: {
                        by_id: {
                            terms: {
                                field: '_id',
                                size: 100000,
                            },
                            aggs: {
                                docs: {
                                    top_hits: {
                                        size: 1,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        size: 0,
    });

    const diffGeneExpByCategory: FetchDiffGeneExpResponse = body?.aggregations;

    return diffGeneExpByCategory.by_category.buckets.map(categoryBucket => {
        const points: DiffGeneExpPoint[] = categoryBucket.by_id.buckets.map(exp => ({
            gene_symbol: exp.docs.hits.hits[0]._source.gene_symbol,
            x: exp.docs.hits.hits[0]._source.x,
            y: exp.docs.hits.hits[0]._source.y,
        }));
        return {
            id: categoryBucket.key,
            data: points,
        };
    });
};
