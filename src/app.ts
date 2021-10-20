import addAsync from '@awaitjs/express';
import SQS from 'aws-sdk/clients/sqs';
import cors from 'cors';
import express, { Express } from 'express';
import { Keycloak } from 'keycloak-connect';

import { dependencies, version } from '../package.json';
import genomicFeatureSuggestions, { SUGGESTIONS_TYPES } from './endpoints/genomicFeatureSuggestions';
import { search, SearchPayload } from './endpoints/search';
import { searchAllSources } from './endpoints/searchByIds/searchAllSources';
import { SearchByIdsResult } from './endpoints/searchByIds/searchByIdsTypes';
import {
    createSet,
    deleteSet,
    getSets,
    SubActionTypes,
    updateSetContent,
    updateSetTag,
} from './endpoints/sets/setsFeature';
import { CreateSetBody, Set, SetSqon, UpdateSetContentBody, UpdateSetTagBody } from './endpoints/sets/setsTypes';
import { calculateSurvivalForSqonResult } from './endpoints/survival';
import { esHost, keycloakURL } from './env';
import { globalErrorHandler, globalErrorLogger } from './errors';
import { ArrangerProject } from './sqon/searchSqon';

export default (keycloak: Keycloak, sqs: SQS, getProject: (projectId: string) => ArrangerProject): Express => {
    const app = addAsync.addAsync(express());

    app.use(cors());

    app.use(express.json());

    app.use(
        keycloak.middleware({
            logout: '/logout',
            admin: '/',
        }),
    );

    app.get('/status', (_req, res) =>
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

    app.postAsync('/survival', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const sqon: SetSqon = req.body.sqon;
        const projectId: string = req.body.project;
        const data = await calculateSurvivalForSqonResult(sqon, projectId, userId, accessToken, getProject);

        res.send({ data });
    });

    app.postAsync('/search', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const searchBody: SearchPayload[] | SearchPayload = req.body;

        if (Array.isArray(searchBody)) {
            const searchResults: Promise<unknown>[] = searchBody.map(s =>
                search(userId, accessToken, s.projectId, s.query, s.variables, getProject),
            );
            const data = await Promise.all(searchResults);

            res.send(data);
        } else {
            const data = await search(
                userId,
                accessToken,
                searchBody.projectId,
                searchBody.query,
                searchBody.variables,
                getProject,
            );

            res.send(data);
        }
    });

    app.postAsync('/searchByIds', keycloak.protect(), async (req, res) => {
        const ids: string[] = req.body.ids;
        const projectId: string = req.body.project;
        const participants: SearchByIdsResult[] = await searchAllSources(ids, projectId, getProject);

        res.send({ participants });
    });

    app.getAsync('/sets', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const userSets = await getSets(accessToken, userId);

        res.send(userSets);
    });

    app.postAsync('/sets', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const createdSet = await createSet(req.body as CreateSetBody, accessToken, userId, sqs, getProject);

        res.send(createdSet);
    });

    app.putAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
        const requestBody: UpdateSetTagBody | UpdateSetContentBody = req.body;
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const setId: string = req.params.setId;
        let updatedSet: Set;

        if (requestBody.subAction === SubActionTypes.RENAME_TAG) {
            updatedSet = await updateSetTag(requestBody as UpdateSetTagBody, accessToken, userId, setId, sqs);
        } else {
            updatedSet = await updateSetContent(
                requestBody as UpdateSetContentBody,
                accessToken,
                userId,
                setId,
                sqs,
                getProject,
            );
        }
        res.send(updatedSet);
    });

    app.deleteAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const setId: string = req.params.setId;

        const deletedResult = await deleteSet(accessToken, setId, userId, sqs);

        res.send(deletedResult);
    });

    app.use(globalErrorLogger, globalErrorHandler);

    return app;
};
