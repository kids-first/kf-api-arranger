import EsInstance from '../../ElasticSearchClientInstance';
import {
    ES_CHROMOSOME_AGG_SIZE,
    ES_SEARCH_MAX_BUCKETS,
    ES_SEARCH_MAX_HITS,
    esDiffGeneExp,
    esSampleGeneExp,
} from '../../esUtils';
import {
    DiffGeneExpPoint,
    DiffGeneExpVolcano,
    Facets,
    FetchDiffGeneExpResponse,
    SampleGeneExpPoint,
    SampleGeneExpVolcano,
} from './types';

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
                                size: ES_SEARCH_MAX_BUCKETS,
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
            chromosome: exp.docs.hits.hits[0]._source.chromosome,
        }));
        return {
            id: categoryBucket.key,
            data: points,
        };
    });
};

export const fetchSampleGeneExp = async (gene_symbol: string): Promise<SampleGeneExpVolcano> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esSampleGeneExp,
        body: {
            size: ES_SEARCH_MAX_HITS,
            query: {
                match: {
                    gene_symbol,
                },
            },
            _source: ['sample_id', 'x', 'y'],
        },
    });

    const points: SampleGeneExpPoint[] = body.hits.hits.map(hit => hit._source);

    return {
        data: points,
        gene_symbol,
        nControl: points.filter(p => p.x === 0).length,
        nT21: points.filter(p => p.x === 1).length,
    };
};

export const fetchFacets = async (): Promise<Facets> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esDiffGeneExp,
        body: {
            size: 0,
            aggs: {
                by_chr: {
                    terms: {
                        field: 'chromosome',
                        size: ES_CHROMOSOME_AGG_SIZE,
                    },
                },
            },
        },
    });

    const by_chr_buckets: { key: string; doc_count: number }[] = body?.aggregations.by_chr.buckets;

    return {
        chromosome: by_chr_buckets,
    };
};
