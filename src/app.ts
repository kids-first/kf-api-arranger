import addAsync from '@awaitjs/express';
import SQS from 'aws-sdk/clients/sqs';
import cors from 'cors';
import express, { Express } from 'express';
import { Keycloak } from 'keycloak-connect';
import NodeCache from 'node-cache';

import { dependencies, version } from '../package.json';
import genomicFeatureSuggestions, { SUGGESTIONS_TYPES } from './endpoints/genomicFeatureSuggestions';
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
import { getStatistics } from './endpoints/statistics';
import { calculateSurvivalForSqonResult } from './endpoints/survival';
import { cacheTTL, esHost, keycloakURL } from './env';
import { globalErrorHandler, globalErrorLogger } from './errors';
import { STATISTICS_CACHE_ID, verifyCache } from './middleware/cache';
import { injectBodyHttpHeaders } from './middleware/injectBodyHttpHeaders';
import { resolveSetIdMiddleware } from './middleware/resolveSetIdInSqon';
import { ArrangerProject } from './sqon/searchSqon';
import { getPhenotypesNodes } from './endpoints/phenotypes';

export default (keycloak: Keycloak, sqs: SQS, getProject: (projectId: string) => ArrangerProject): Express => {
    const app = addAsync.addAsync(express());

    const cache = new NodeCache({ stdTTL: cacheTTL });

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

    app.useAsync(resolveSetIdMiddleware());

    app.get('/status', (_req, res) =>
        res.send({
            dependencies,
            version,
            keycloak: keycloakURL,
            elasticsearch: esHost,
        }),
    );

    app.post('/cache-clear', keycloak.protect('realm:ADMIN'), async (_req, res) => {
        cache.flushAll();
        res.send('OK');
    });

    app.getAsync('/genesFeature/suggestions/:prefix', keycloak.protect(), (req, res) =>
        genomicFeatureSuggestions(req, res, SUGGESTIONS_TYPES.GENE),
    );
    app.getAsync('/variantsFeature/suggestions/:prefix', keycloak.protect(), (req, res) =>
        genomicFeatureSuggestions(req, res, SUGGESTIONS_TYPES.VARIANT),
    );

    app.getAsync('/statistics', verifyCache(STATISTICS_CACHE_ID, cache), async (req, res) => {
        const data = await getStatistics();
        cache.set(STATISTICS_CACHE_ID, data);
        res.json(data);
    });

    app.postAsync('/survival', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const sqon: SetSqon = req.body.sqon;
        const projectId: string = req.body.project;
        const data = await calculateSurvivalForSqonResult(sqon, projectId, userId, accessToken, getProject);

        res.send({ data });
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

    app.postAsync('/phenotypes', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const sqon: SetSqon = req.body.sqon;
        const type: string = req.body.type;
        const projectId: string = req.body.project;
        const aggregations_filter_themselves: boolean = req.body.aggregations_filter_themselves || false;
        const data = await getPhenotypesNodes(
            sqon,
            projectId,
            getProject,
            type,
            aggregations_filter_themselves,
            accessToken,
            userId,
        );

        res.send({ data });
    });

    app.use(globalErrorLogger, globalErrorHandler);

    return app;
};
