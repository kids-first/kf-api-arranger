import { Express } from 'express';
import Keycloak from 'keycloak-connect';
import request from 'supertest';
import buildApp from './app';
import { getToken, publicKey } from '../test/authTestUtils';
import { createSet, deleteSet, getSets, Set, updateSet } from './endpoints/setsFeature';
import { keycloakClient, keycloakRealm, keycloakURL } from './env';
import { RiffError } from './riff/riffError';
import { Riff } from './riff/riffClient';

jest.mock('./endpoints/setsFeature');

describe('Express app (without Arranger)', () => {
    let app: Express;
    let keycloakFakeConfig;

    beforeEach(() => {
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
        app = buildApp(keycloak); // Re-create app between each test to ensure isolation between tests.
    });

    it('GET /status (public) should responds with json', async () => {
        await request(app)
            .get('/status')
            .expect('Content-Type', /json/);
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
                uid: 'qwertyuiop',
                alias: 'Nevus',
                content: {
                    type: 'set',
                    participantIds: ['participant1', 'participant2'],
                    sqon: {},
                },
                sharedPublicly: false,
                creationDate: new Date(),
                updatedDate: new Date(),
            } as Riff;
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
            tag: 'Nevus Updated',
        };

        beforeEach(() => {
            (updateSet as jest.Mock).mockReset();
        });

        it('should return 403 if no Authorization header', () =>
            request(app)
                .put('/sets/1eh')
                .expect(403));

        it('should return 200 if Authorization header contains valid token and no error occurs', async () => {
            const expectedUpdatedSet = {
                id: '1eh',
                uid: 'qwertyuiop',
                alias: 'Nevus Updated',
                content: {
                    type: 'set',
                    participantIds: ['participant1', 'participant2'],
                    sqon: {},
                },
                sharedPublicly: false,
                creationDate: new Date(),
                updatedDate: new Date(),
            } as Riff;
            (updateSet as jest.Mock).mockImplementation(() => expectedUpdatedSet);

            const token = getToken();

            const checkRes = res => {
                expect(JSON.stringify(res.body)).toEqual(JSON.stringify(expectedUpdatedSet));
            };

            await request(app)
                .put('/sets/1eh')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(checkRes)
                .expect(200);
            expect((updateSet as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return 500 if Authorization header contains valid token but an error occurs', async () => {
            const expectedError = new RiffError(400, { message: 'OOPS' });
            (updateSet as jest.Mock).mockImplementation(() => {
                throw expectedError;
            });

            const token = getToken();

            await request(app)
                .put('/sets/1eh')
                .send(requestBody)
                .set('Content-type', 'application/json')
                .set({ Authorization: `Bearer ${token}` })
                .expect(500, { error: 'Internal Server Error' });
            expect((updateSet as jest.Mock).mock.calls.length).toEqual(1);
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
});
