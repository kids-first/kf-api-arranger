import { vi } from 'vitest';
import { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';

import {
    fakeKeycloakClient,
    fakeKeycloakRealm,
    fakeKeycloakUrl,
    getToken,
    publicKey,
} from '../../../test/authTestUtils.js';
import buildApp from '../../app.js';
import type { RunInternalQuery } from '../../arrangerUtils.js';
import { flushAllCache } from '../../middleware/cache.js';
import {
    checkGenesExist,
    checkSampleIdsAndGene,
    exportDiffGeneExp,
    exportSampleGeneExp,
    fetchDiffGeneExp,
    fetchFacets,
    fetchSampleGeneExp,
} from './service.js';
import { DiffGeneExpVolcano, Facets as TranscriptomicsFacets, SampleGeneExpVolcano } from './types.js';

vi.mock('./service');

// Silence the production-path error logger for this suite — several tests
// deliberately trigger globalErrorLogger (mocked routes throw, real handler
// console.errors the result). The stack-trace dumps make passing runs look
// like a fire. Scoped to this file so unexpected console.errors elsewhere
// still surface.
beforeAll(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterAll(() => { vi.restoreAllMocks(); });

describe('Transcriptomics router', () => {
    let app: Express;
    let keycloakFakeConfig;

    const runInternalQuery: RunInternalQuery = async () => ({ data: null });

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
        app = buildApp(keycloak, runInternalQuery); // Re-create app between each test to ensure isolation between tests.
    });

    describe('POST /transcriptomics/diffGeneExp', () => {
        beforeEach(() => {
            vi.mocked(fetchDiffGeneExp).mockReset();
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

            vi.mocked(fetchDiffGeneExp).mockResolvedValue(diffGeneExpByCategory);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/diffGeneExp')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, diffGeneExpByCategory);
            expect(vi.mocked(fetchDiffGeneExp)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(fetchDiffGeneExp).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/diffGeneExp')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(fetchDiffGeneExp)).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /transcriptomics/diffGeneExp/export', () => {
        beforeEach(() => {
            vi.mocked(exportDiffGeneExp).mockReset();
            flushAllCache();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const data = { url: 'pre-signed-url' };

            vi.mocked(exportDiffGeneExp).mockResolvedValue(data);

            const token = getToken();

            await request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, data);
            expect(vi.mocked(exportDiffGeneExp)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(exportDiffGeneExp).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/transcriptomics/diffGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(exportDiffGeneExp)).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /transcriptomics/sampleGeneExp', () => {
        beforeEach(() => {
            vi.mocked(fetchSampleGeneExp).mockReset();
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

            vi.mocked(fetchSampleGeneExp).mockResolvedValue(sampleGeneExp);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, sampleGeneExp);
            expect(vi.mocked(fetchSampleGeneExp)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(fetchSampleGeneExp).mock.calls[0][0]).toEqual('ENSG00000272368.2');
        });

        it('should return 400 if Authorization header contains valid token but no gene is provided', async () => {
            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send({ ...requestBody, ensembl_gene_id: '' })
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(400);
            expect(vi.mocked(fetchSampleGeneExp)).toHaveBeenCalledTimes(0);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(fetchSampleGeneExp).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/sampleGeneExp')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(fetchSampleGeneExp)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(fetchSampleGeneExp).mock.calls[0][0]).toEqual('ENSG00000272368.2');
        });
    });

    describe('GET /transcriptomics/sampleGeneExp/export', () => {
        beforeEach(() => {
            vi.mocked(exportSampleGeneExp).mockReset();
            flushAllCache();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const data = { url: 'pre-signed-url' };

            vi.mocked(exportSampleGeneExp).mockResolvedValue(data);

            const token = getToken();

            await request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, data);
            expect(vi.mocked(exportSampleGeneExp)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(exportSampleGeneExp).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/transcriptomics/sampleGeneExp/export')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(exportSampleGeneExp)).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /transcriptomics/facets', () => {
        beforeEach(() => {
            vi.mocked(fetchFacets).mockReset();
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

            vi.mocked(fetchFacets).mockResolvedValue(facets);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/facets')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, facets);
            expect(vi.mocked(fetchFacets)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(fetchFacets).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/facets')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(fetchFacets)).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /transcriptomics/checkSampleIdsAndGene', () => {
        beforeEach(() => {
            vi.mocked(checkSampleIdsAndGene).mockReset();
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
            vi.mocked(checkSampleIdsAndGene).mockResolvedValue(sampleIds);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkSampleIdsAndGene')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(200, sampleIds);
            expect(vi.mocked(checkSampleIdsAndGene)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(checkSampleIdsAndGene).mock.calls[0][0]).toEqual(requestBody.sample_ids);
            expect(vi.mocked(checkSampleIdsAndGene).mock.calls[0][1]).toEqual(requestBody.ensembl_gene_id);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(checkSampleIdsAndGene).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkSampleIdsAndGene')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(checkSampleIdsAndGene)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(checkSampleIdsAndGene).mock.calls[0][0]).toEqual(requestBody.sample_ids);
            expect(vi.mocked(checkSampleIdsAndGene).mock.calls[0][1]).toEqual(requestBody.ensembl_gene_id);
        });
    });

    describe('POST /transcriptomics/checkGenesExist', () => {
        beforeEach(() => {
            vi.mocked(checkGenesExist).mockReset();
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
            vi.mocked(checkGenesExist).mockResolvedValue(matchedGenes);

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkGenesExist')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(200, matchedGenes);
            expect(vi.mocked(checkGenesExist)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(checkGenesExist).mock.calls[0][0]).toEqual(requestBody.genes);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(checkGenesExist).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/transcriptomics/checkGenesExist')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .send(requestBody)
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(checkGenesExist)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(checkGenesExist).mock.calls[0][0]).toEqual(requestBody.genes);
        });
    });
});
