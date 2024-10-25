import EsInstance from '../../ElasticSearchClientInstance';
import {
    ES_CHROMOSOME_AGG_SIZE,
    ES_SEARCH_MAX_BUCKETS,
    ES_SEARCH_MAX_HITS,
    esDiffGeneExpIndex,
    esSampleGeneExpIndex,
} from '../../esUtils';
import {
    DiffGeneExpPoint,
    DiffGeneExpVolcano,
    Facets,
    FetchDiffGeneExpResponse,
    FetchSampleGeneExpBySampleIdResponse,
    SampleGeneExpPoint,
    SampleGeneExpVolcano,
} from './types';

export const fetchDiffGeneExp = async (): Promise<DiffGeneExpVolcano[]> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esDiffGeneExpIndex,
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
            ensembl_gene_id: exp.docs.hits.hits[0]._source.ensembl_gene_id,
            padj: exp.docs.hits.hits[0]._source.padj,
            fold_change: exp.docs.hits.hits[0]._source.fold_change,
        }));
        return {
            id: categoryBucket.key,
            data: points,
        };
    });
};

export const fetchSampleGeneExp = async (ensembl_gene_id: string): Promise<SampleGeneExpVolcano> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esSampleGeneExpIndex,
        body: {
            size: ES_SEARCH_MAX_HITS,
            query: {
                match: {
                    ensembl_gene_id,
                },
            },
            _source: ['sample_id', 'x', 'y'],
        },
    });

    const points: SampleGeneExpPoint[] = body.hits.hits.map(hit => hit._source);

    return {
        data: points,
        ensembl_gene_id,
        nControl: points.filter(p => p.x === 0).length,
        nT21: points.filter(p => p.x === 1).length,
    };
};

export const fetchFacets = async (): Promise<Facets> => {
    const client = EsInstance.getInstance();
    const { body } = await client.search({
        index: esDiffGeneExpIndex,
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

export const checkSampleIdsAndGene = async (sample_ids: string[], ensembl_gene_id?: string): Promise<string[]> => {
    const client = EsInstance.getInstance();

    const filter: unknown[] = [
        {
            terms: {
                sample_id: sample_ids,
            },
        },
    ];

    if (ensembl_gene_id && ensembl_gene_id.length > 0) {
        filter.push({
            match: {
                ensembl_gene_id,
            },
        });
    }

    const { body } = await client.search({
        index: esSampleGeneExpIndex,
        body: {
            size: 0,
            query: {
                bool: {
                    must: filter,
                },
            },
            aggs: {
                by_sample: {
                    terms: {
                        field: 'sample_id',
                        size: sample_ids.length,
                    },
                },
            },
        },
    });

    const sampleGeneExpBySample: FetchSampleGeneExpBySampleIdResponse = body?.aggregations;

    return sampleGeneExpBySample.by_sample.buckets.map(b => b.key);
};
