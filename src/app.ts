import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import addAsync from '@awaitjs/express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { Keycloak } from 'keycloak-connect';

import { dependencies, version } from '../package.json';
import { keycloakURL, esHost } from './env';
import genomicFeatureSuggestions, { SUGGESTIONS_TYPES } from './endpoints/genomicFeatureSuggestions';
import { createSet, deleteSet, getSets, updateSet } from './endpoints/setsFeature';

export default (keycloak: Keycloak): Express => {
    const app = addAsync.addAsync(express());

    app.use(cors());

    app.use(express.json());

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

    app.getAsync('/sets', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const userSets = await getSets(accessToken, userId);

        res.send(userSets);
    });

    app.postAsync('/sets', keycloak.protect(), async (req, res) => {
        const { sqon, sort, projectId, type, path, tag } = req.body;
        const accessToken = req.headers.authorization;
        const createdSet = await createSet(sqon, sort, projectId, type, path, tag, accessToken);

        res.send(createdSet);
    });

    app.putAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
        const { sqon, sort, projectId, type, path, tag } = req.body;
        const accessToken = req.headers.authorization;
        const setId: string = req.params.setId;

        const updatedSet = await updateSet(sqon, sort, projectId, type, path, tag, accessToken, setId);

        res.send(updatedSet);
    });

    app.deleteAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const setId: string = req.params.setId;

        const deletedResult = await deleteSet(accessToken, setId);

        res.send(deletedResult);
    });

    app.use((error: Error, _req: Request, res: Response, _: NextFunction) => {
        console.error(error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
    });

    return app;
};
