import buildApp from './app';
import request from 'supertest';

describe('Express app (without Arranger)', () => {
  let app;
  beforeAll(async (done) => {
    app = buildApp();
    await done();
  });

  afterAll(() => {
    app.closeAll();
  });

  it('GET /status (public) should responds with json', () => {
    return request(app).get('/status').expect('Content-Type', /json/);
  });
});
