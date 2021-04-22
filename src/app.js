import express from 'express';
import cors from 'cors';
import { dependencies, version } from '../package.json';
import { egoURL, esHost } from './env';
import { injectBodyHttpHeaders } from './middleware';
import egoTokenMiddleware from 'ego-token-middleware';
import variantDBStats from './endpoints/variantDBStats';
import genomicFeatureSuggestions from './endpoints/genomicFeatureSuggestions';
import asyncHandler from 'express-async-handler';

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
      elasticsearch: esHost,
    }),
  );

  app.get('/variantDbStats', variantDBStats());

  app.get('/genomicFeature/suggestions/:prefix', asyncHandler(genomicFeatureSuggestions));

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
          route: [
            `/(.*)/graphql`,
            `/(.*)/graphql/(.*)`,
            `/(.*)/download`,
            `/genomicFeature/suggestions`,
          ],
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
  app.use((error, req, res, _) => {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
