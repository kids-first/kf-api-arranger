import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import addAsync from '@awaitjs/express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { Keycloak } from 'keycloak-connect';

import { dependencies, version } from '../package.json';
import { keycloakURL, esHost } from './env';
import genomicFeatureSuggestions, { SUGGESTIONS_TYPES } from './endpoints/genomicFeatureSuggestions';
import { injectBodyHttpHeaders } from './middleware/injectBodyHttpHeaders';

export default (keycloak: Keycloak): Express => {
    const app = addAsync.addAsync(express());

    app.use(cors());

    app.use(express.json({ limit: '50mb' }));
    app.use(
        express.urlencoded({
            extended: true,
            limit: '50mb',
        }),
    );
    app.use(injectBodyHttpHeaders());

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

    app.getAsync('/genesFeature/suggestions/:prefix', keycloak.protect(), (req, res) =>
        genomicFeatureSuggestions(req, res, SUGGESTIONS_TYPES.GENE),
    );
    app.getAsync('/variantsFeature/suggestions/:prefix', keycloak.protect(), (req, res) =>
        genomicFeatureSuggestions(req, res, SUGGESTIONS_TYPES.VARIANT),
    );

    app.use((error: Error, _req: Request, res: Response, _: NextFunction) => {
        console.error(error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
    });

    return app;
};
