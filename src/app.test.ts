import AWS from 'aws-sdk';
import { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';

import { getToken, publicKey } from '../test/authTestUtils';
import buildApp from './app';
import { searchAllSources } from './endpoints/searchByIds/searchAllSources';
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
import { getStatistics, Statistics } from './endpoints/statistics';
import { calculateSurvivalForSqonResult } from './endpoints/survival';
import { keycloakClient, keycloakRealm, keycloakURL } from './env';
import { RiffError } from './riff/riffError';
import { ArrangerProject } from './sqon/searchSqon';

jest.mock('./endpoints/sets/setsFeature');
jest.mock('./endpoints/survival');
jest.mock('./endpoints/statistics');
jest.mock('./endpoints/searchByIds/searchAllSources');

describe('Express app (without Arranger)', () => {
    let app: Express;
    let keycloakFakeConfig;

    const getProject = (_s: string) => ({} as ArrangerProject);

    beforeEach(() => {
        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
        const publicKeyToVerify = publicKey;
        keycloakFakeConfig = {
            realm: keycloakRealm,
            'confidential-port': 0,
            'bearer-only': true,
            'auth-server-url': keycloakURL,
            'ssl-required': 'external',
            resource: keycloakClient,
            'realm-public-key': publicKeyToVerify, // For test purpose, we use public key to validate token.
        };
        const keycloak = new Keycloak({}, keycloakFakeConfig);
        app = buildApp(keycloak, sqs, getProject); // Re-create app between each test to ensure isolation between tests.
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
        });

        it('should return 200 if no error occurs', async () => {
            const expectedStats: Statistics = {
                files: 27105,
                fileSize: '441.69 TB',
                studies: 7,
                samples: 6111,
                families: 1291,
                participants: 4330,
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
            const expectedError = new RiffError(404, { message: 'OOPS' });
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
            const expectedError = new RiffError(400, { message: 'OOPS' });
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
            expect((updateSetTag as jest.Mock).mock.calls[0][2]).toEqual(userId);
            expect((updateSetTag as jest.Mock).mock.calls[0][3]).toEqual('1eh');
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
            const expectedError = new RiffError(404, { message: 'OOPS' });
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

    describe('POST /survival', () => {
        const requestBody = {
            project: '2021_05_03_v2',
            sqon: {
                op: 'and',
                content: [{ op: 'in', content: { field: 'gender', value: ['Female'] } }],
            },
        };

        beforeEach(() => {
            (calculateSurvivalForSqonResult as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/survival')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const mockSurvivalResponse = [
                {
                    start: 0,
                    end: 1,
                    died: 7,
                    censored: 467,
                    cumulativeSurvival: 1,
                    donors: [
                        {
                            time: 0,
                            censored: true,
                            meta: {
                                id: 'PT_HXDR3ZX6',
                            },
                        },
                    ],
                },
                {
                    start: 1,
                    end: 3,
                    died: 1,
                    censored: 1,
                    cumulativeSurvival: 0.9944223107569721,
                    donors: [
                        {
                            time: 2,
                            censored: true,
                            meta: {
                                id: 'PT_A0V7V4N0',
                            },
                        },
                        {
                            time: 3,
                            censored: false,
                            meta: {
                                id: 'PT_Y7GFMG49',
                            },
                        },
                    ],
                },
            ];
            (calculateSurvivalForSqonResult as jest.Mock).mockImplementation(() => mockSurvivalResponse);

            const token = getToken();

            await request(app)
                .post('/survival')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, { data: mockSurvivalResponse });
            expect((calculateSurvivalForSqonResult as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (calculateSurvivalForSqonResult as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/survival')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((calculateSurvivalForSqonResult as jest.Mock).mock.calls.length).toEqual(1);
        });
    });

    describe('POST /searchByIds', () => {
        const requestBody = {
            project: '2021_05_03_v2',
            ids: ['PT_HXDR3ZX6'],
        };

        beforeEach(() => {
            (searchAllSources as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .post('/searchByIds')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const mockSearchByIdsResponse = [
                { search: 'PT_HXDR3ZX6', type: 'PARTICIPANT', participantIds: ['PT_HXDR3ZX6'] },
            ];
            (searchAllSources as jest.Mock).mockImplementation(() => mockSearchByIdsResponse);

            const token = getToken();

            await request(app)
                .post('/searchByIds')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(200, { participants: mockSearchByIdsResponse });
            expect((searchAllSources as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new Error('OOPS');
            (searchAllSources as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .post('/searchByIds')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((searchAllSources as jest.Mock).mock.calls.length).toEqual(1);
        });
    });
});
