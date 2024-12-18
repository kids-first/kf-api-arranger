import { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';

import { fakeKeycloakClient, fakeKeycloakRealm, fakeKeycloakUrl, getToken, publicKey } from '../test/authTestUtils';
import buildApp from './app';
import { ArrangerProject } from './arrangerUtils';
import { SetNotFoundError } from './endpoints/sets/setError';
import {
    createSet,
    deleteSet,
    getSets,
    SubActionTypes,
    updateSetContent,
    updateSetTag,
} from './endpoints/sets/setsFeature';
import { Set, UpdateSetContentBody, UpdateSetTagBody } from './endpoints/sets/setsTypes';
import { getStatistics, getStudiesStatistics, Statistics } from './endpoints/statistics';
import { flushAllCache } from './middleware/cache';
import { UserApiError } from './userApi/userApiError';

jest.mock('./endpoints/sets/setsFeature');
jest.mock('./endpoints/statistics');

describe('Express app (without Arranger)', () => {
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

    it('GET /status (public) should responds with json', async () => {
        await request(app)
            .get('/status')
            .expect('Content-Type', /json/);
    });

    describe('POST /cache-clear', () => {
        it('should return 403 if no Authorization header', async () =>
            await request(app)
                .post('/cache-clear')
                .expect(403));

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
            (getStatistics as jest.Mock).mockReset();
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
            (getStatistics as jest.Mock).mockImplementation(() => expectedStats);

            await request(app)
                .get('/statistics')
                .expect(200, expectedStats);
            expect((getStatistics as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (getStatistics as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            await request(app)
                .get('/statistics')
                .expect(500, { error: 'Internal Server Error' });
            expect((getStatistics as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('GET /statistics/studies', () => {
        beforeEach(() => {
            (getStudiesStatistics as jest.Mock).mockReset();
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
            (getStudiesStatistics as jest.Mock).mockImplementation(() => expectedPublicStats);

            await request(app)
                .get('/statistics/studies')
                .expect(200, expectedPublicStats);
            expect((getStudiesStatistics as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (getStudiesStatistics as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            await request(app)
                .get('/statistics/studies')
                .expect(500, { error: 'Internal Server Error' });
            expect((getStudiesStatistics as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('GET /sets', () => {
        beforeEach(() => {
            (getSets as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .get('/sets')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const expectedSets = [
                {
                    id: '1ae',
                    tag: 'tag1',
                    size: 11,
                } as Set,
                {
                    id: '1af',
                    tag: 'tag2',
                    size: 22,
                } as Set,
            ];
            (getSets as jest.Mock).mockImplementation(() => expectedSets);

            const token = getToken();

            await request(app)
                .get('/sets')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, expectedSets);
            expect((getSets as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(404, { message: 'OOPS' });
            (getSets as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .get('/sets')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((getSets as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('POST /sets', () => {
        const requestBody = {
            projectId: '2021_05_03_v2',
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
            (createSet as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/sets')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const expectedCreatedSet = {
                id: '1eg',
                tag: 'Nevus',
                size: 2,
            } as Set;
            (createSet as jest.Mock).mockImplementation(() => expectedCreatedSet);

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
            expect((createSet as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(400, { message: 'OOPS' });
            (createSet as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/sets')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((createSet as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('PUT /sets/:setId', () => {
        const updateSetTagBody: UpdateSetTagBody = {
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.RENAME_TAG,
            newTag: 'Nevus Updated',
        };

        const updateSetContentBody: UpdateSetContentBody = {
            projectId: '2021_05_03_v2',
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
            (updateSetTag as jest.Mock).mockReset();
            (updateSetContent as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .put('/sets/1eh')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs - update tag name', async () => {
            const expectedUpdatedSet = {
                id: '1eh',
                size: 2,
                tag: 'Nevus Updated',
            } as Set;
            (updateSetTag as jest.Mock).mockImplementation(() => expectedUpdatedSet);

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

            expect((updateSetTag as jest.Mock).mock.calls.length).toEqual(1);
            expect((updateSetTag as jest.Mock).mock.calls[0][0]).toEqual(updateSetTagBody);
            expect((updateSetTag as jest.Mock).mock.calls[0][1]).toEqual(`Bearer ${token}`);
            expect((updateSetTag as jest.Mock).mock.calls[0][2]).toEqual('1eh');
        });

        it('should return 200 if Authorization header contains valid token and no error occurs - update content', async () => {
            const expectedUpdatedSet = {
                id: '1eh',
                size: 2,
                tag: 'Nevus',
            } as Set;
            (updateSetContent as jest.Mock).mockImplementation(() => expectedUpdatedSet);

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
            expect((updateSetContent as jest.Mock).mock.calls.length).toEqual(1);
            expect((updateSetContent as jest.Mock).mock.calls[0][0]).toEqual(updateSetContentBody);
            expect((updateSetContent as jest.Mock).mock.calls[0][1]).toEqual(`Bearer ${token}`);
            expect((updateSetContent as jest.Mock).mock.calls[0][2]).toEqual(userId);
            expect((updateSetContent as jest.Mock).mock.calls[0][3]).toEqual('1eh');
        });

        it('should return 404 if Authorization header contains valid token but set to update does not exist', async () => {
            const expectedError = new SetNotFoundError('Set to update can not be found !');
            (updateSetTag as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .put('/sets/1eh')
                .send(updateSetTagBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(404, { error: 'Not Found' });
            expect((updateSetTag as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('DELETE /sets/:setId', () => {
        beforeEach(() => {
            (deleteSet as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .delete('/sets/1eh')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            (deleteSet as jest.Mock).mockImplementation(() => true);

            const token = getToken();

            await request(app)
                .delete('/sets/1ei')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, 'true');
            expect((deleteSet as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new UserApiError(404, { message: 'OOPS' });
            (deleteSet as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .delete('/sets/1ei')
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((deleteSet as jest.Mock).mock.calls.length).toEqual(1);
        });
    });
});
