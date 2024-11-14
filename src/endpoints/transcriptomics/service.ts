import EsInstance from '../../ElasticSearchClientInstance';
import { datalakeS3Url } from '../../env';
import {
    ES_CHROMOSOME_AGG_SIZE,
    ES_SEARCH_MAX_BUCKETS,
    ES_SEARCH_MAX_HITS,
    esDiffGeneExpIndex,
    esSampleGeneExpIndex,
} from '../../esUtils';
import { generatePreSignedUrl } from '../../s3Api';
import {
    DiffGeneExpPoint,
    DiffGeneExpVolcano,
    ExportResponse,
    Facets,
    FetchDiffGeneExpResponse,
    FetchDistinctGenesBySymbolOrEnsemblId,
    FetchSampleGeneExpBySampleIdResponse,
    MatchedGene,
    SampleGeneExpPoint,
    SampleGeneExpVolcano,
} from './types';

export const DIFF_GENE_EXP_FILE_KEY = 'transcriptomics/diff_gene_exp/HTP/data.txt';
export const SAMPLE_GENE_EXP_FILE_KEY = 'transcriptomics/sample_gene_exp/HTP/data.txt';

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

export const exportDiffGeneExp = async (): Promise<ExportResponse> => {
    const url = await generatePreSignedUrl(datalakeS3Url, DIFF_GENE_EXP_FILE_KEY);
    return { url };
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
            _source: ['sample_id', 'x', 'y', 'age_at_biospecimen_collection_years', 'sex'],
        },
    });

    const hits = body.hits.hits ?? [];

    const points: SampleGeneExpPoint[] = [];
    let min_age_at_biospecimen_collection_years = hits[0]._source.age_at_biospecimen_collection_years;
    let max_age_at_biospecimen_collection_years = hits[0]._source.age_at_biospecimen_collection_years;
    let min_fpkm_value = hits[0]._source.y;
    let max_fpkm_value = hits[0]._source.y;
    let nControl = 0;
    let nT21 = 0;

    for (const hit of body.hits.hits) {
        // Add new point
        points.push({
            sample_id: hit._source.sample_id,
            x: hit._source.x,
            y: hit._source.y,
            sex: hit._source.sex,
            age_at_biospecimen_collection_years: hit._source.age_at_biospecimen_collection_years,
        });

        // Add point to nT21 or nControl depending on x
        if (hit._source.x === 0) {
            nControl += 1;
        }
        if (hit._source.x === 1) {
            nT21 += 1;
        }

        // Calculate min and max of age and fpkm
        if (hit._source.age_at_biospecimen_collection_years > max_age_at_biospecimen_collection_years) {
            max_age_at_biospecimen_collection_years = hit._source.age_at_biospecimen_collection_years;
        }

        if (hit._source.age_at_biospecimen_collection_years < min_age_at_biospecimen_collection_years) {
            min_age_at_biospecimen_collection_years = hit._source.age_at_biospecimen_collection_years;
        }

        if (hit._source.y > max_fpkm_value) {
            max_fpkm_value = hit._source.y;
        }

        if (hit._source.y < min_fpkm_value) {
            min_fpkm_value = hit._source.y;
        }
    }

    return {
        data: points,
        ensembl_gene_id,
        nControl,
        nT21,
        min_age_at_biospecimen_collection_years,
        max_age_at_biospecimen_collection_years,
        min_fpkm_value,
        max_fpkm_value,
    };
};

export const exportSampleGeneExp = async (): Promise<ExportResponse> => {
    const url = await generatePreSignedUrl(datalakeS3Url, SAMPLE_GENE_EXP_FILE_KEY);
    return { url };
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

export const checkGenesExist = async (genes: string[]): Promise<MatchedGene[]> => {
    const client = EsInstance.getInstance();
    const genesUpperCase = genes.map(gene => gene.toUpperCase());

    const { body } = await client.search({
        index: esDiffGeneExpIndex,
        body: {
            query: {
                bool: {
                    should: [
                        {
                            terms: {
                                gene_symbol: genesUpperCase,
                            },
                        },
                        {
                            terms: {
                                ensembl_gene_id: genesUpperCase,
                            },
                        },
                    ],
                },
            },
            size: 0,
            aggs: {
                distinct_genes: {
                    composite: {
                        sources: [
                            { gene_symbol: { terms: { field: 'gene_symbol' } } },
                            { ensembl_gene_id: { terms: { field: 'ensembl_gene_id' } } },
                        ],
                        size: genes.length,
                    },
                },
            },
        },
    });

    const distinctGenesBySymbolOrEnsemblId: FetchDistinctGenesBySymbolOrEnsemblId = body?.aggregations;

    return distinctGenesBySymbolOrEnsemblId.distinct_genes.buckets.map(bucket => ({
        gene_symbol: bucket.key.gene_symbol,
        ensembl_gene_id: bucket.key.ensembl_gene_id,
    }));
};
