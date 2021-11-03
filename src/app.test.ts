import { Express } from 'express';
import Keycloak, { KeycloakConfig } from 'keycloak-connect';
import request from 'supertest';
import buildApp from './app';

describe('Express app (without Arranger)', () => {
    let app: Express;
    let keycloakFakeConfig: KeycloakConfig;

    beforeEach(() => {
        keycloakFakeConfig = {
            realm: 'KidsFirst',
            'confidential-port': 0,
            'bearer-only': true,
            'auth-server-url': 'fakeKeycloakUrl',
            'ssl-required': 'external',
            resource: 'kf-api-variant-cluster',
        };
        const keycloak = new Keycloak({}, keycloakFakeConfig);
        app = buildApp(keycloak); // Re-create app between each test to ensure isolation between tests.
    });

    it('GET /status (public) should responds with json', async () => {
        await request(app)
            .get('/status')
            .expect('Content-Type', /json/);
    });
});
