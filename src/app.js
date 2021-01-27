import express from 'express';
import cors from 'cors';
import { dependencies, version } from '../package.json';
import { egoURL, esHost, projectId } from './env';
import { injectBodyHttpHeaders } from './middleware';
import egoTokenMiddleware from 'ego-token-middleware';

export default () => {
  const app = express();
  app.use(cors());
  /*
   * ===== PUBLIC ROUTES =====
   * Adding routes before ego middleware makes them available to all public
   */
  app.get('/status', (req, res) =>
    res.send({
      dependencies,
      version,
      ego: egoURL,
      project: projectId,
      elasticsearch: esHost,
    }),
  );

  app.use(injectBodyHttpHeaders());
  app.use(
    egoTokenMiddleware({
      egoURL,
      accessRules: [
        {
          type: 'allow',
          route: ['/', '/(.*)'],
          role: 'admin',
        },
        {
          type: 'deny',
          route: ['/', '/(.*)'],
          role: ['user'],
        },
        {
          type: 'allow',
          route: [`/(.*)/graphql`, `/(.*)/graphql/(.*)`, `/(.*)/download`],
          status: ['approved'],
          role: 'user',
        },
        {
          type: 'allow',
          route: [`/(.*)/ping`],
          tokenExempt: true,
        },
      ],
    }),
  );
  /*
   * ===== RESTRICTED ROUTES =====
   * Adding routes after ego middleware makes them require a valid Bearer Token (Ego JWT)
   */
  return app;
};
