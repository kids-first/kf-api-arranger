import express from 'express';
import cors from 'cors';
import { dependencies, version } from '../package.json';
import { keycloakURL, esHost } from './env';
import { injectBodyHttpHeaders } from './middleware';
import genomicFeatureSuggestions from './endpoints/genomicFeatureSuggestions';
import asyncHandler from 'express-async-handler';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

export default (keycloak) => {
  const app = express();

  app.use(cors());

  app.use(
    keycloak.middleware({
        logout: '/logout',
        admin: '/',
    }),
  );

  app.get('/status', (req, res) =>
    res.send({
      dependencies,
      version,
      keycloak: keycloakURL,
      elasticsearch: esHost,
    }),
  );

  app.get('/genomicFeature/suggestions/:prefix', keycloak.protect(), asyncHandler(genomicFeatureSuggestions));

  app.use(injectBodyHttpHeaders());

  app.use((error, req, res, _) => {
    console.error(error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
  });

  return app;
};
