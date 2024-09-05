import EsInstance from '../../ElasticSearchClientInstance';
import { fetchDiffGeneExp, fetchFacets, fetchSampleGeneExp } from '.';
import { DiffGeneExpVolcano, Facets, SampleGeneExpVolcano } from './types';

jest.mock('../../ElasticSearchClientInstance');

describe('Transcriptomics', () => {
    describe('fetchDiffGeneExp', () => {
        beforeEach(() => {
            (EsInstance.getInstance as jest.Mock).mockReset();
        });

        it('fetchDiffGeneExp should return gene expr group by category', async () => {
            const mockEsResponseBody = {
                took: 218,
                timed_out: false,
                _shards: {
                    total: 5,
                    successful: 5,
                    skipped: 0,
                    failed: 0,
                },
                hits: {
                    total: {
                        value: 10000,
                        relation: 'gte',
                    },
                    max_score: null,
                    hits: [],
                },
                aggregations: {
                    by_category: {
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                        buckets: [
                            {
                                key: 'not_significant',
                                doc_count: 16167,
                                by_id: {
                                    doc_count_error_upper_bound: 5,
                                    sum_other_doc_count: 16157,
                                    buckets: [
                                        {
                                            key: '-C9tmpEB0zu1NPYlB4AU',
                                            doc_count: 1,
                                            docs: {
                                                hits: {
                                                    total: {
                                                        value: 1,
                                                        relation: 'eq',
                                                    },
                                                    max_score: 1.0,
                                                    hits: [
                                                        {
                                                            _index: 'diff_gene_exp_htp_re_20240828_6',
                                                            _type: '_doc',
                                                            _id: '-C9tmpEB0zu1NPYlB4AU',
                                                            _score: 1.0,
                                                            _source: {
                                                                external_dataset_id: 'DS001',
                                                                statistical_method: 'DESeq2',
                                                                comparison: 'DS_status|T21_vs_Control',
                                                                model_specification: '~Sex+Age+Sample_source',
                                                                ensembl_gene_id: 'ENSG00000149531.15',
                                                                feature_id_type: 'Gene|Gencode/Ensembl',
                                                                gene_symbol: 'FRG1BP',
                                                                padj: 1.82e-5,
                                                                padj_type: 'BH FDR',
                                                                chromosome: 'chr20',
                                                                gene_start: '30377372',
                                                                gene_end: '30399257',
                                                                gene_type: 'unprocessed_pseudogene',
                                                                study_id: 'HTP',
                                                                release_id: 're_20240828_6',
                                                                fold_change: 0.769135672,
                                                                p_value: 4.51e-6,
                                                                x: -0.37868998947354676,
                                                                y: 10.914088963881525,
                                                                category: 'not_significant',
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                            {
                                key: 'up_regulated',
                                doc_count: 290,
                                by_id: {
                                    doc_count_error_upper_bound: 5,
                                    sum_other_doc_count: 280,
                                    buckets: [
                                        {
                                            key: '-C9tmpEB0zu1NPYlDK8f',
                                            doc_count: 1,
                                            docs: {
                                                hits: {
                                                    total: {
                                                        value: 1,
                                                        relation: 'eq',
                                                    },
                                                    max_score: 1.0,
                                                    hits: [
                                                        {
                                                            _index: 'diff_gene_exp_htp_re_20240828_6',
                                                            _type: '_doc',
                                                            _id: '-C9tmpEB0zu1NPYlDK8f',
                                                            _score: 1.0,
                                                            _source: {
                                                                external_dataset_id: 'DS001',
                                                                statistical_method: 'DESeq2',
                                                                comparison: 'DS_status|T21_vs_Control',
                                                                model_specification: '~Sex+Age+Sample_source',
                                                                ensembl_gene_id: 'ENSG00000272368.2',
                                                                feature_id_type: 'Gene|Gencode/Ensembl',
                                                                gene_symbol: 'AC074032.1',
                                                                padj: 0.905295961,
                                                                padj_type: 'BH FDR',
                                                                chromosome: 'chr12',
                                                                gene_start: '50112197',
                                                                gene_end: '50165618',
                                                                gene_type: 'lncRNA',
                                                                study_id: 'HTP',
                                                                release_id: 're_20240828_6',
                                                                fold_change: 1.005756065,
                                                                p_value: 0.874566414,
                                                                x: 0.00828043785818933,
                                                                y: 0.09949336001516859,
                                                                category: 'up_regulated',
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                        {
                                            key: '-S9tmpEB0zu1NPYlDK8f',
                                            doc_count: 1,
                                            docs: {
                                                hits: {
                                                    total: {
                                                        value: 1,
                                                        relation: 'eq',
                                                    },
                                                    max_score: 1.0,
                                                    hits: [
                                                        {
                                                            _index: 'diff_gene_exp_htp_re_20240828_6',
                                                            _type: '_doc',
                                                            _id: '-S9tmpEB0zu1NPYlDK8f',
                                                            _score: 1.0,
                                                            _source: {
                                                                external_dataset_id: 'DS001',
                                                                statistical_method: 'DESeq2',
                                                                comparison: 'DS_status|T21_vs_Control',
                                                                model_specification: '~Sex+Age+Sample_source',
                                                                ensembl_gene_id: 'ENSG00000213693.4',
                                                                feature_id_type: 'Gene|Gencode/Ensembl',
                                                                gene_symbol: 'SEC14L1P1',
                                                                padj: 0.905862845,
                                                                padj_type: 'BH FDR',
                                                                chromosome: 'chr11',
                                                                gene_start: '43897456',
                                                                gene_end: '43899636',
                                                                gene_type: 'processed_pseudogene',
                                                                study_id: 'HTP',
                                                                release_id: 're_20240828_6',
                                                                fold_change: 1.009293148,
                                                                p_value: 0.875178561,
                                                                x: 0.013345264376017407,
                                                                y: 0.09886736960876816,
                                                                category: 'up_regulated',
                                                            },
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            };

            const expectedResponse: DiffGeneExpVolcano[] = [
                {
                    id: 'not_significant',
                    data: [
                        {
                            gene_symbol: 'FRG1BP',
                            x: -0.37868998947354676,
                            y: 10.914088963881525,
                            chromosome: 'chr20',
                            ensembl_gene_id: 'ENSG00000149531.15',
                        },
                    ],
                },
                {
                    id: 'up_regulated',
                    data: [
                        {
                            gene_symbol: 'AC074032.1',
                            x: 0.00828043785818933,
                            y: 0.09949336001516859,
                            chromosome: 'chr12',
                            ensembl_gene_id: 'ENSG00000272368.2',
                        },
                        {
                            gene_symbol: 'SEC14L1P1',
                            x: 0.013345264376017407,
                            y: 0.09886736960876816,
                            chromosome: 'chr11',
                            ensembl_gene_id: 'ENSG00000213693.4',
                        },
                    ],
                },
            ];

            (EsInstance.getInstance as jest.Mock).mockImplementation(() => ({
                search: async () => ({ body: mockEsResponseBody }),
            }));

            const result = await fetchDiffGeneExp();

            expect(result).toEqual(expectedResponse);
        });
    });

    describe('fetchSampleGeneExp', () => {
        beforeEach(() => {
            (EsInstance.getInstance as jest.Mock).mockReset();
        });

        it('should return gene exp by sample for a specific gene symbol', async () => {
            const mockEsResponseBody = {
                took: 10,
                timed_out: false,
                _shards: {
                    total: 5,
                    successful: 5,
                    skipped: 0,
                    failed: 0,
                },
                hits: {
                    total: {
                        value: 3,
                        relation: 'eq',
                    },
                    max_score: 9.83696,
                    hits: [
                        {
                            _index: 'sample_gene_exp_htp_re_20240828_6',
                            _type: '_doc',
                            _id: 'R_1kmpEB0zu1NPYlGBAz',
                            _score: 9.83696,
                            _source: {
                                sample_id: 'bs-aa000aaa',
                                x: 1,
                                y: 2.4399124042981217,
                            },
                        },
                        {
                            _index: 'sample_gene_exp_htp_re_20240828_6',
                            _type: '_doc',
                            _id: '2PlkmpEBRqsooo59Hexg',
                            _score: 9.83696,
                            _source: {
                                sample_id: 'bs-bbbb11b1',
                                x: 0,
                                y: 0.90884870449667,
                            },
                        },
                        {
                            _index: 'sample_gene_exp_htp_re_20240828_6',
                            _type: '_doc',
                            _id: '5_pkmpEBRqsooo59OXsu',
                            _score: 9.83696,
                            _source: {
                                sample_id: 'bs-ccc22cc2',
                                x: 1,
                                y: 0.909129052666039,
                            },
                        },
                    ],
                },
            };

            const expectedResponse: SampleGeneExpVolcano = {
                data: [
                    { sample_id: 'bs-aa000aaa', x: 1, y: 2.4399124042981217 },
                    {
                        sample_id: 'bs-bbbb11b1',
                        x: 0,
                        y: 0.90884870449667,
                    },
                    {
                        sample_id: 'bs-ccc22cc2',
                        x: 1,
                        y: 0.909129052666039,
                    },
                ],
                gene_symbol: 'LINC01881',
                nControl: 1,
                nT21: 2,
            };

            (EsInstance.getInstance as jest.Mock).mockImplementation(() => ({
                search: async () => ({ body: mockEsResponseBody }),
            }));

            const result = await fetchSampleGeneExp('LINC01881');

            expect(result).toEqual(expectedResponse);
        });
    });

    describe('fetchFacets', () => {
        beforeEach(() => {
            (EsInstance.getInstance as jest.Mock).mockReset();
        });

        it('should return chromosome and doc count for each one', async () => {
            const mockEsResponseBody = {
                took: 1,
                timed_out: false,
                _shards: {
                    total: 5,
                    successful: 5,
                    skipped: 0,
                    failed: 0,
                },
                hits: {
                    total: {
                        value: 10000,
                        relation: 'gte',
                    },
                    max_score: null,
                    hits: [],
                },
                aggregations: {
                    by_chr: {
                        doc_count_error_upper_bound: 518,
                        sum_other_doc_count: 10610,
                        buckets: [
                            {
                                key: 'chr1',
                                doc_count: 1692,
                            },
                            {
                                key: 'chr19',
                                doc_count: 1318,
                            },
                            {
                                key: 'chr2',
                                doc_count: 1098,
                            },
                            {
                                key: 'chr17',
                                doc_count: 1084,
                            },
                            {
                                key: 'chr11',
                                doc_count: 939,
                            },
                        ],
                    },
                },
            };

            const expectedResponse: Facets = {
                chromosome: [
                    { key: 'chr1', doc_count: 1692 },
                    { key: 'chr19', doc_count: 1318 },
                    { key: 'chr2', doc_count: 1098 },
                    { key: 'chr17', doc_count: 1084 },
                    { key: 'chr11', doc_count: 939 },
                ],
            };

            (EsInstance.getInstance as jest.Mock).mockImplementation(() => ({
                search: async () => ({ body: mockEsResponseBody }),
            }));

            const result = await fetchFacets();

            expect(result).toEqual(expectedResponse);
        });
    });
});
