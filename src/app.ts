import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import addAsync from '@awaitjs/express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { Keycloak } from 'keycloak-connect';

import { dependencies, version } from '../package.json';
import { keycloakURL, esHost } from './env';
import genomicFeatureSuggestions from './endpoints/genomicFeatureSuggestions';

export default (keycloak: Keycloak): Express => {
    const app = addAsync.addAsync(express());

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

    app.getAsync('/genomicFeature/suggestions/:prefix', keycloak.protect(), genomicFeatureSuggestions);

    app.use((error: Error, _req: Request, res: Response, _: NextFunction) => {
        console.error(error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
    });

    return app;
};
