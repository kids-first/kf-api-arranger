import express from 'express';
import cors from 'cors';
import { dependencies, version } from '../package.json';
import { egoURL, esHost } from './env';
import { injectBodyHttpHeaders } from './middleware';
import egoTokenMiddleware from 'ego-token-middleware';
import genomicFeatureSuggestions from './endpoints/genomicFeatureSuggestions';
import asyncHandler from 'express-async-handler';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

export const suggestionType = {
  VARIANT: 'variant',
  GENE: 'gene',
};
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
          route: [`/genesFeature/suggestions/(.*)`, `/variantsFeature/suggestions/(.*)`, `/(.*)/graphql`, `/(.*)/graphql/(.*)`, `/(.*)/download`],
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
  app.get(
    '/genesFeature/suggestions/:prefix',
    asyncHandler((req, res) => genomicFeatureSuggestions(req, res, suggestionType.GENE)),
  );
  app.get(
    '/variantsFeature/suggestions/:prefix',
    asyncHandler((req, res) => genomicFeatureSuggestions(req, res, suggestionType.VARIANT)),
  );

  app.use((error, req, res, _) => {
    console.error(error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
  });

  return app;
};
