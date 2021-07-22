import Keycloak from 'keycloak-connect';
import buildApp from './app';
import request from 'supertest';

describe('Express app (without Arranger)', () => {
  let app;
  beforeAll(async (done) => {
    const keycloakFakeConfig = {
      realm: 'KidsFirst',
      'confidential-port': 0,
      'bearer-only': true,
      'auth-server-url': 'fakeKeycloakUrl',
      'ssl-required': 'external',
      resource: 'kf-api-variant-cluster',
  };
    const keycloak = new Keycloak({}, keycloakFakeConfig);
    app = buildApp(keycloak);
    await done();
  });

  afterAll(() => {
    app.closeAll();
  });

  it('GET /status (public) should responds with json', () => {
    return request(app).get('/status').expect('Content-Type', /json/);
  });
});
