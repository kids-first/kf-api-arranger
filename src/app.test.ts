import type { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';
import { vi } from 'vitest';
import buildApp from './app.js';
import type { RunInternalQuery } from './arrangerUtils.js';
import { fakeKeycloakClient, fakeKeycloakRealm, fakeKeycloakUrl, getToken, publicKey } from './auth.test-utils.js';
import { SetNotFoundError } from './endpoints/sets/setError.js';
import {
    createSet,
    deleteSet,
    getSets,
    SubActionTypes,
    updateSetContent,
    updateSetTag,
} from './endpoints/sets/setsFeature.js';
import type { SavedSet, UpdateSetContentBody, UpdateSetTagBody } from './endpoints/sets/setsTypes.js';
import { getStatistics, getStudiesStatistics, type Statistics } from './endpoints/statistics/index.js';
import { flushAllCache } from './middleware/cache.js';
import { UserApiError } from './userApi/userApiError.js';

vi.mock('./endpoints/sets/setsFeature.js');
vi.mock('./endpoints/statistics/index.js');

// Silence the production-path error logger for this suite — several tests
// deliberately trigger globalErrorLogger (mocked routes throw, real handler
// console.errors the result). The stack-trace dumps make passing runs look
// like a fire. Scoped to this file so unexpected console.errors elsewhere
// still surface.
beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
    vi.restoreAllMocks();
});

describe('Express app', () => {
    let app: Express;

    const runInternalQuery: RunInternalQuery = async () => ({ data: null });

    beforeEach(() => {
        const keycloakFakeConfig = {
            realm: fakeKeycloakRealm,
            'confidential-port': 0,
            'bearer-only': true,
            'auth-server-url': fakeKeycloakUrl,
            'ssl-required': 'external',
            resource: fakeKeycloakClient,
            'realm-public-key': publicKey, // For test purpose, we use public key to validate token.
        };
        const keycloak = new Keycloak({}, keycloakFakeConfig);
        app = buildApp(keycloak, runInternalQuery); // Re-create app between each test to ensure isolation between tests.
    });

    it('GET /status (public) should respond with json', async () => {
        await request(app).get('/status').expect('Content-Type', /json/);
    });

    describe('POST /cache-clear', () => {
        it('should return 403 if no Authorization header', async () =>
            await request(app).post('/cache-clear').expect(403));

        it('should return 403 if not an ADMIN', async () => {
            const token = getToken();

            await request(app)
                .post('/cache-clear')
                .set({ Authorization: `Bearer ${token}` })
                .expect(403);
        });

        it('should return 200 if no error occurs', async () => {
            const token = getToken(1000, '12345-678-90abcdef', ['ADMIN']);

            await request(app)
                .post('/cache-clear')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, 'OK');
        });
    });

    describe('GET /statistics', () => {
        beforeEach(() => {
            vi.mocked(getStatistics).mockReset();
            flushAllCache();
        });

        it('should return 200 if no error occurs', async () => {
            const expectedStats: Statistics = {
                files: 27105,
                fileSize: '441.69 TB',
                studies: 7,
                samples: 6111,
                families: 1291,
                participants: 4330,
                variants: 1312312,
                genomes: 13575,
                transcriptomes: 5454,
                sex: {
                    male: 4387,
                    female: 4302,
                    unknown: 4,
                    other: 3,
                },
                downSyndromeStatus: {
                    T21: 7266,
                    D21: 1430,
                },
                race: {
                    White: 7029,
                    'Black or African American': 618,
                    Unknown: 408,
                    Asian: 269,
                    NoInformation: 131,
                    other: 66,
                    'asked but unknown': 58,
                    'More than one race': 37,
                    unknown: 35,
                    'American Indian or Alaska Native': 34,
                    'Native Hawaiian or Other Pacific Islander': 8,
                    'not available': 3,
                },
                ethnicity: {
                    'Not Hispanic or Latino': 20460,
                    NoInformation: 6263,
                    'Hispanic or Latino': 4107,
                    'not available': 1419,
                    unknown: 775,
                },
                diagnosis: [
                    {
                        mondo_id: 'speech disorder (MONDO:0004730)',
                        count: 2277,
                    },
                    {
                        mondo_id: 'hearing loss disorder (MONDO:0005365)',
                        count: 1978,
                    },
                    {
                        mondo_id: 'intellectual disability (MONDO:0001071)',
                        count: 1970,
                    },
                    {
                        mondo_id: 'hypothyroidism (MONDO:0005420)',
                        count: 1734,
                    },
                    {
                        mondo_id: 'sleep apnea syndrome (MONDO:0005296)',
                        count: 1360,
                    },
                    {
                        mondo_id: 'atrial septal defect (MONDO:0006664)',
                        count: 1243,
                    },
                    {
                        mondo_id: 'ventricular septal defect (MONDO:0002070)',
                        count: 1105,
                    },
                    {
                        mondo_id: 'specific language impairment (MONDO:0000724)',
                        count: 1068,
                    },
                    {
                        mondo_id: 'congenital heart disease (MONDO:0005453)',
                        count: 991,
                    },
                    {
                        mondo_id: 'gastroesophageal reflux disease (MONDO:0007186)',
                        count: 867,
                    },
                ],
            };
            vi.mocked(getStatistics).mockResolvedValue(expectedStats);

            await request(app).get('/statistics').expect(200, expectedStats);
            expect(vi.mocked(getStatistics)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(getStatistics).mockImplementation(() => {
                throw expectedError;
            });

            await request(app).get('/statistics').expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(getStatistics)).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /statistics/studies', () => {
        beforeEach(() => {
            vi.mocked(getStudiesStatistics).mockReset();
            flushAllCache();
        });

        it('should return 200 if no error occurs', async () => {
            const expectedPublicStats = {
                studies: [
                    { participant_count: 334, domain: 'BIRTHDEFECT', study_code: 'KF-EATF' },
                    {
                        participant_count: 183,
                        domain: 'CANCER',
                        study_code: 'KF-DSD',
                    },
                    { participant_count: 759, domain: 'BIRTHDEFECTANDCANCER', study_code: 'KF-OFCAA' },
                    {
                        participant_count: 50,
                        domain: 'BIRTHDEFECT',
                        study_code: 'KF-FASD',
                    },
                    { participant_count: 774, domain: 'BIRTHDEFECTANDCANCER', study_code: 'KF-RSBD' },
                    {
                        participant_count: 356,
                        domain: 'CANCER',
                        study_code: 'KF-IGCT',
                    },
                    { participant_count: 599, domain: 'CANCER', study_code: 'KF-AIS' },
                    {
                        participant_count: 185,
                        domain: 'BIRTHDEFECT',
                        study_code: 'KF-FALL',
                    },
                    { participant_count: 255, domain: 'BIRTHDEFECT', study_code: 'KF-CDL' },
                    {
                        participant_count: 517,
                        domain: 'BIRTHDEFECTANDCANCER',
                        study_code: 'KF-CHARGE',
                    },
                ],
            };
            vi.mocked(getStudiesStatistics).mockResolvedValue(expectedPublicStats);

            await request(app).get('/statistics/studies').expect(200, expectedPublicStats);
            expect(vi.mocked(getStudiesStatistics)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if an error occurs', async () => {
            const expectedError = new Error('OOPS');
            vi.mocked(getStudiesStatistics).mockImplementation(() => {
                throw expectedError;
            });

            await request(app).get('/statistics/studies').expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(getStudiesStatistics)).toHaveBeenCalledTimes(1);
        });
    });

    describe('GET /sets', () => {
        beforeEach(() => {
            vi.mocked(getSets).mockReset();
        });

        it('should return 403 if no Authorization header', () => request(app).get('/sets').expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const expectedSets = [
                {
                    id: '1ae',
                    tag: 'tag1',
                    size: 11,
                } as SavedSet,
                {
                    id: '1af',
                    tag: 'tag2',
                    size: 22,
                } as SavedSet,
            ];
            vi.mocked(getSets).mockResolvedValue(expectedSets);

            const token = getToken();

            await request(app)
                .get('/sets')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, expectedSets);
            expect(vi.mocked(getSets)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(404, { message: 'OOPS' });
            vi.mocked(getSets).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/sets')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(getSets)).toHaveBeenCalledTimes(1);
        });
    });

    describe('POST /sets', () => {
        const requestBody = {
            type: 'participant',
            sqon: {
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: {
                            field: 'phenotype.source_text_phenotype',
                            value: ['Nevus'],
                        },
                    },
                ],
            },
            path: 'kf_id',
            sort: [],
            tag: 'Nevus',
        };

        beforeEach(() => {
            vi.mocked(createSet).mockReset();
        });

        it('should return 403 if no Authorization header', () => request(app).post('/sets').expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const expectedCreatedSet = {
                id: '1eg',
                tag: 'Nevus',
                size: 2,
            } as SavedSet;
            vi.mocked(createSet).mockResolvedValue(expectedCreatedSet);

            const token = getToken();

            const checkRes = res => {
                expect(JSON.stringify(res.body)).toEqual(JSON.stringify(expectedCreatedSet));
            };

            await request(app)
                .post('/sets')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(checkRes)
                .expect(200);
            expect(vi.mocked(createSet)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(400, { message: 'OOPS' });
            vi.mocked(createSet).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/sets')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(createSet)).toHaveBeenCalledTimes(1);
        });
    });

    describe('PUT /sets/:setId', () => {
        const updateSetTagBody: UpdateSetTagBody = {
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.RENAME_TAG,
            newTag: 'Nevus Updated',
        };

        const updateSetContentBody: UpdateSetContentBody = {
            sourceType: 'QUERY',
            subAction: SubActionTypes.ADD_IDS,
            sqon: {
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: {
                            field: 'phenotype.source_text_phenotype',
                            value: ['Nevus'],
                        },
                    },
                ],
            },
        };

        beforeEach(() => {
            vi.mocked(updateSetTag).mockReset();
            vi.mocked(updateSetContent).mockReset();
        });

        it('should return 403 if no Authorization header', () => request(app).put('/sets/1eh').expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs - update tag name', async () => {
            const expectedUpdatedSet = {
                id: '1eh',
                size: 2,
                tag: 'Nevus Updated',
            } as SavedSet;
            vi.mocked(updateSetTag).mockResolvedValue(expectedUpdatedSet);

            const userId = 'user_id';
            const token = getToken(1000, userId);

            const checkRes = res => {
                expect(JSON.stringify(res.body)).toEqual(JSON.stringify(expectedUpdatedSet));
            };

            await request(app)
                .put('/sets/1eh')
                .send(updateSetTagBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(checkRes)
                .expect(200);

            expect(vi.mocked(updateSetTag)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(updateSetTag).mock.calls[0][0]).toEqual(updateSetTagBody);
            expect(vi.mocked(updateSetTag).mock.calls[0][1]).toEqual(`Bearer ${token}`);
            expect(vi.mocked(updateSetTag).mock.calls[0][2]).toEqual('1eh');
        });

        it('should return 200 if Authorization header contains valid token and no error occurs - update content', async () => {
            const expectedUpdatedSet = {
                id: '1eh',
                size: 2,
                tag: 'Nevus',
            } as SavedSet;
            vi.mocked(updateSetContent).mockResolvedValue(expectedUpdatedSet);

            const userId = 'user_id';
            const token = getToken(1000, userId);

            const checkRes = res => {
                expect(JSON.stringify(res.body)).toEqual(JSON.stringify(expectedUpdatedSet));
            };

            await request(app)
                .put('/sets/1eh')
                .send(updateSetContentBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(checkRes)
                .expect(200);
            expect(vi.mocked(updateSetContent)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(updateSetContent).mock.calls[0][0]).toEqual(updateSetContentBody);
            expect(vi.mocked(updateSetContent).mock.calls[0][1]).toEqual(`Bearer ${token}`);
            expect(vi.mocked(updateSetContent).mock.calls[0][2]).toEqual(userId);
            expect(vi.mocked(updateSetContent).mock.calls[0][3]).toEqual('1eh');
        });

        it('should return 404 if Authorization header contains valid token but set to update does not exist', async () => {
            const expectedError = new SetNotFoundError('Set to update can not be found !');
            vi.mocked(updateSetTag).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .put('/sets/1eh')
                .send(updateSetTagBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(404, { error: 'Not Found' });
            expect(vi.mocked(updateSetTag)).toHaveBeenCalledTimes(1);
        });
    });

    describe('DELETE /sets/:setId', () => {
        beforeEach(() => {
            vi.mocked(deleteSet).mockReset();
        });

        it('should return 403 if no Authorization header', () => request(app).delete('/sets/1eh').expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            vi.mocked(deleteSet).mockResolvedValue('1ei');

            const token = getToken();

            await request(app)
                .delete('/sets/1ei')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, '1ei');
            expect(vi.mocked(deleteSet)).toHaveBeenCalledTimes(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(404, { message: 'OOPS' });
            vi.mocked(deleteSet).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .delete('/sets/1ei')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect(vi.mocked(deleteSet)).toHaveBeenCalledTimes(1);
        });
    });
});
