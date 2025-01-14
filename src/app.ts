import cors from 'cors';
import express, { Express } from 'express';
import { Keycloak } from 'keycloak-connect';

import { dependencies, version } from '../package.json';
import { ArrangerProject } from './arrangerUtils';
import { computeAuthorizedStudiesForAllFences } from './endpoints/authorizedStudies/computeAuthorizedStudies';
import genomicFeatureSuggestions, { SUGGESTIONS_TYPES } from './endpoints/genomicFeatureSuggestions';
import { getPhenotypesNodes } from './endpoints/phenotypes';
import {
    createSet,
    deleteSet,
    getSets,
    SubActionTypes,
    updateSetContent,
    updateSetTag,
} from './endpoints/sets/setsFeature';
import { CreateSetBody, Set, SetSqon, UpdateSetContentBody, UpdateSetTagBody } from './endpoints/sets/setsTypes';
import { getStatistics, getStudiesStatistics } from './endpoints/statistics';
import transcriptomicsRouter from './endpoints/transcriptomics/route';
import { computeUpset } from './endpoints/upset';
import { esHost, keycloakURL, userApiURL } from './env';
import { globalErrorHandler, globalErrorLogger } from './errors';
import {
    flushAllCache,
    STATISTICS_CACHE_ID,
    STATISTICS_PUBLIC_CACHE_ID,
    updateCache,
    verifyCache,
} from './middleware/cache';
import { injectBodyHttpHeaders } from './middleware/injectBodyHttpHeaders';
import { resolveSetIdMiddleware } from './middleware/resolveSetIdInSqon';

export default (keycloak: Keycloak, getProject: (projectId: string) => ArrangerProject): Express => {
    const app = express();

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

    app.use(resolveSetIdMiddleware());

    app.get('/status', (_req, res, next) => {
        try {
            res.send({
                dependencies,
                version,
                keycloak: keycloakURL,
                elasticsearch: esHost,
                users: userApiURL,
                arrangerNext: true,
            });
        } catch (e) {
            next(e);
        }
    });

    app.post('/cache-clear', keycloak.protect('realm:ADMIN'), async (_req, res, next) => {
        try {
            flushAllCache();
            res.send('OK');
        } catch (e) {
            next(e);
        }
    });

    app.use('/transcriptomics', keycloak.protect(), transcriptomicsRouter);

    app.get('/genesFeature/suggestions/:prefix', keycloak.protect(), (req, res, next) =>
        genomicFeatureSuggestions(req, res, next, SUGGESTIONS_TYPES.GENE),
    );
    app.get('/variantsFeature/suggestions/:prefix', keycloak.protect(), (req, res, next) =>
        genomicFeatureSuggestions(req, res, next, SUGGESTIONS_TYPES.VARIANT),
    );
    app.get('/variantsSomaticFeature/suggestions/:prefix', keycloak.protect(), (req, res, next) =>
        genomicFeatureSuggestions(req, res, next, SUGGESTIONS_TYPES.VARIANT_SOMATIC),
    );

    app.get('/statistics', verifyCache(STATISTICS_CACHE_ID), async (_req, res, next) => {
        try {
            const data = await getStatistics();
            updateCache(STATISTICS_CACHE_ID, data);
            res.json(data);
        } catch (e) {
            next(e);
        }
    });

    app.get('/statistics/studies', verifyCache(STATISTICS_PUBLIC_CACHE_ID), async (_req, res, next) => {
        try {
            const data = await getStudiesStatistics();
            updateCache(STATISTICS_PUBLIC_CACHE_ID, data);
            res.json(data);
        } catch (e) {
            next(e);
        }
    });

    app.get('/sets', keycloak.protect(), async (req, res, next) => {
        try {
            const accessToken = req.headers.authorization;
            const userSets = await getSets(accessToken);

            res.send(userSets);
        } catch (e) {
            next(e);
        }
    });

    app.post('/sets', keycloak.protect(), async (req, res, next) => {
        try {
            const accessToken = req.headers.authorization;
            const userId = req['kauth']?.grant?.access_token?.content?.sub;
            const createdSet = await createSet(req.body as CreateSetBody, accessToken, userId, getProject);

            res.send(createdSet);
        } catch (e) {
            next(e);
        }
    });

    app.put('/sets/:setId', keycloak.protect(), async (req, res, next) => {
        try {
            const requestBody: UpdateSetTagBody | UpdateSetContentBody = req.body;
            const accessToken = req.headers.authorization;
            const userId = req['kauth']?.grant?.access_token?.content?.sub;
            const setId: string = req.params.setId;
            let updatedSet: Set;

            if (requestBody.subAction === SubActionTypes.RENAME_TAG) {
                updatedSet = await updateSetTag(requestBody as UpdateSetTagBody, accessToken, setId);
            } else {
                updatedSet = await updateSetContent(
                    requestBody as UpdateSetContentBody,
                    accessToken,
                    userId,
                    setId,
                    getProject,
                );
            }
            res.send(updatedSet);
        } catch (e) {
            next(e);
        }
    });

    app.delete('/sets/:setId', keycloak.protect(), async (req, res, next) => {
        try {
            const accessToken = req.headers.authorization;
            const setId: string = req.params.setId;

            const deletedResult = await deleteSet(accessToken, setId);

            res.send(deletedResult);
        } catch (e) {
            next(e);
        }
    });

    app.post('/phenotypes', keycloak.protect(), async (req, res, next) => {
        try {
            const accessToken = req.headers.authorization;
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
            );

            res.send({ data });
        } catch (e) {
            next(e);
        }
    });

    app.post('/authorized-studies', keycloak.protect(), async (req, res, next) => {
        computeAuthorizedStudiesForAllFences(req, res, next);
    });

    app.post('/upset', keycloak.protect(), async (req, res, next) => {
        try {
            const data = await computeUpset(req.body.sqon, req.body.topN);
            res.send(data);
        } catch (e) {
            next(e);
        }
    });

    app.use(globalErrorLogger, globalErrorHandler);

    return app;
};
