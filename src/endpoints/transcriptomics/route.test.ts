import { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';

import {
    fakeKeycloakClient,
    fakeKeycloakRealm,
    fakeKeycloakUrl,
    getToken,
    publicKey,
} from '../../../test/authTestUtils';
import buildApp from '../../app';
import { ArrangerProject } from '../../arrangerUtils';
import { flushAllCache } from '../../middleware/cache';
import {
    checkGenesExist,
    checkSampleIdsAndGene,
    exportDiffGeneExp,
    exportSampleGeneExp,
    fetchDiffGeneExp,
    fetchFacets,
    fetchSampleGeneExp,
} from './service';
import { DiffGeneExpVolcano, Facets as TranscriptomicsFacets, SampleGeneExpVolcano } from './types';

jest.mock('./service');

describe('Transcriptomics router', () => {
    let app: Express;
    let keycloakFakeConfig;

    const getProject = (_s: string) => ({} as ArrangerProject);

    beforeEach(() => {
        const publicKeyToVerify = publicKey;
        keycloakFakeConfig = {
            realm: fakeKeycloakRealm,
            'confidential-port': 0,
            'bearer-only': true,
            'auth-server-url': fakeKeycloakUrl,
            'ssl-required': 'external',
            resource: fakeKeycloakClient,
            'realm-public-key': publicKeyToVerify, // For test purpose, we use public key to validate token.
        };
        const keycloak = new Keycloak({}, keycloakFakeConfig);
        app = buildApp(keycloak, getProject); // Re-create app between each test to ensure isolation between tests.
    });

    describe('POST /transcriptomics/diffGeneExp', () => {
        beforeEach(() => {
            (fetchDiffGeneExp as jest.Mock).mockReset();
            flushAllCache();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/transcriptomics/diffGeneExp')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const diffGeneExpByCategory: DiffGeneExpVolcano[] = [
                {
                    id: 'not_significant',
                    data: [
                        {
                            gene_symbol: 'FRG1BP',
                            x: -0.37868998947354676,
                            y: 10.914088963881525,
                            chromosome: 'chr20',
                            ensembl_gene_id: 'ENSG00000149531.15',
                            padj: 1.82e-5,
                            fold_change: 0.769135672,
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
                            padj: 0.905295961,
                            fold_change: 1.005756065,
                        },
                        {
                            gene_symbol: 'SEC14L1P1',
                            x: 0.013345264376017407,
                            y: 0.09886736960876816,
                            chromosome: 'chr11',
                            ensembl_gene_id: 'ENSG00000213693.4',
                            padj: 0.905862845,
                            fold_change: 1.009293148,
                        },
                    ],
                },
            ];

            (fetchDiffGeneExp as jest.Mock).mockImplementation(() => diffGeneExpByCategory);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/diffGeneExp')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, diffGeneExpByCategory);
            expect((fetchDiffGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (fetchDiffGeneExp as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/diffGeneExp')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((fetchDiffGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('GET /transcriptomics/diffGeneExp/export', () => {
        beforeEach(() => {
            (exportDiffGeneExp as jest.Mock).mockReset();
            flushAllCache();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const data = { url: 'pre-signed-url' };

            (exportDiffGeneExp as jest.Mock).mockImplementation(() => data);

            const token = getToken();

            await request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, data);
            expect((exportDiffGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (exportDiffGeneExp as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((exportDiffGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('POST /transcriptomics/sampleGeneExp', () => {
        beforeEach(() => {
            (fetchSampleGeneExp as jest.Mock).mockReset();
        });

        const requestBody = {
            ensembl_gene_id: 'ENSG00000272368.2',
        };

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send(requestBody)
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const sampleGeneExp: SampleGeneExpVolcano = {
                data: [
                    {
                        sample_id: 'bs-aa000aaa',
                        x: 1,
                        y: 2.4399124042981217,
                        age_at_biospecimen_collection_years: 1.6,
                        sex: 'Female',
                    },
                    {
                        sample_id: 'bs-bbbb11b1',
                        x: 0,
                        y: 0.90884870449667,
                        age_at_biospecimen_collection_years: 2.7,
                        sex: 'Male',
                    },
                    {
                        sample_id: 'bs-ccc22cc2',
                        x: 1,
                        y: 0.909129052666039,
                        age_at_biospecimen_collection_years: 3.9,
                        sex: 'Female',
                    },
                ],
                ensembl_gene_id: 'ENSG00000272368.2',
                nControl: 1,
                nT21: 2,
                min_age_at_biospecimen_collection_years: 1.6,
                max_age_at_biospecimen_collection_years: 3.9,
                min_fpkm_value: 0.90884870449667,
                max_fpkm_value: 2.4399124042981217,
            };

            (fetchSampleGeneExp as jest.Mock).mockImplementation(() => sampleGeneExp);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, sampleGeneExp);
            expect((fetchSampleGeneExp as jest.Mock).mock.calls.length).toEqual(1);
            expect((fetchSampleGeneExp as jest.Mock).mock.calls[0][0]).toEqual('ENSG00000272368.2');
        });

        it('should return 400 if Authorization header contains valid token but no gene is provided', async () => {
            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send({ ...requestBody, ensembl_gene_id: '' })
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(400);
            expect((fetchSampleGeneExp as jest.Mock).mock.calls.length).toEqual(0);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (fetchSampleGeneExp as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((fetchSampleGeneExp as jest.Mock).mock.calls.length).toEqual(1);
            expect((fetchSampleGeneExp as jest.Mock).mock.calls[0][0]).toEqual('ENSG00000272368.2');
        });
    });

    describe('GET /transcriptomics/sampleGeneExp/export', () => {
        beforeEach(() => {
            (exportSampleGeneExp as jest.Mock).mockReset();
            flushAllCache();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const data = { url: 'pre-signed-url' };

            (exportSampleGeneExp as jest.Mock).mockImplementation(() => data);

            const token = getToken();

            await request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, data);
            expect((exportSampleGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (exportSampleGeneExp as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((exportSampleGeneExp as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('POST /transcriptomics/facets', () => {
        beforeEach(() => {
            (fetchFacets as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/transcriptomics/facets')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const facets: TranscriptomicsFacets = {
                chromosome: [
                    { key: 'chr1', doc_count: 1692 },
                    { key: 'chr19', doc_count: 1318 },
                    { key: 'chr2', doc_count: 1098 },
                    { key: 'chr17', doc_count: 1084 },
                    { key: 'chr11', doc_count: 939 },
                ],
            };

            (fetchFacets as jest.Mock).mockImplementation(() => facets);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/facets')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, facets);
            expect((fetchFacets as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (fetchFacets as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/facets')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((fetchFacets as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('POST /transcriptomics/checkSampleIdsAndGene', () => {
        beforeEach(() => {
            (checkSampleIdsAndGene as jest.Mock).mockReset();
        });

        const requestBody = {
            ensembl_gene_id: 'ENSG00000272368.2',
            sample_ids: ['bs-aa000aaa', 'bs-bbbb11b1', 'abc'],
        };

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/transcriptomics/checkSampleIdsAndGene')
                .set('Content-type', 'application/json')
                .send(requestBody)
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const sampleIds = ['bs-aa000aaa', 'bs-bbbb11b1'];
            (checkSampleIdsAndGene as jest.Mock).mockImplementation(() => sampleIds);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkSampleIdsAndGene')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(200, sampleIds);
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls.length).toEqual(1);
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls[0][0]).toEqual(requestBody.sample_ids);
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls[0][1]).toEqual(requestBody.ensembl_gene_id);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (checkSampleIdsAndGene as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkSampleIdsAndGene')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(500, { error: 'Internal Server Error' });
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls.length).toEqual(1);
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls[0][0]).toEqual(requestBody.sample_ids);
            expect((checkSampleIdsAndGene as jest.Mock).mock.calls[0][1]).toEqual(requestBody.ensembl_gene_id);
        });
    });

    describe('POST /transcriptomics/checkGenesExist', () => {
        beforeEach(() => {
            (checkGenesExist as jest.Mock).mockReset();
        });

        const requestBody = {
            genes: [
                'CYB5R1',
                'TBCA',
                'TOMM5',
                'NRXN2',
                'ENSG00000163462.18',
                'ENSG00000211592',
                'ENSG000002137410',
                'FUT7',
                'AL139424',
                'ENSG00000204882.4',
            ],
        };

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/transcriptomics/checkGenesExist')
                .set('Content-type', 'application/json')
                .send(requestBody)
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const matchedGenes = [
                {
                    gene_symbol: 'GPR20',
                    ensembl_gene_id: 'ENSG00000204882.4',
                },
                {
                    gene_symbol: 'TRIM46',
                    ensembl_gene_id: 'ENSG00000163462.18',
                },
            ];
            (checkGenesExist as jest.Mock).mockImplementation(() => matchedGenes);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkGenesExist')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(200, matchedGenes);
            expect((checkGenesExist as jest.Mock).mock.calls.length).toEqual(1);
            expect((checkGenesExist as jest.Mock).mock.calls[0][0]).toEqual(requestBody.genes);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (checkGenesExist as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkGenesExist')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(500, { error: 'Internal Server Error' });
            expect((checkGenesExist as jest.Mock).mock.calls.length).toEqual(1);
            expect((checkGenesExist as jest.Mock).mock.calls[0][0]).toEqual(requestBody.genes);
        });
    });
});
