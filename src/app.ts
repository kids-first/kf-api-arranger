import addAsync from '@awaitjs/express';
import cors from 'cors';
import express, { Express } from 'express';
import { Keycloak } from 'keycloak-connect';
import NodeCache from 'node-cache';

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
import {
    checkGenesExist,
    checkSampleIdsAndGene,
    fetchDiffGeneExp,
    fetchFacets,
    fetchSampleGeneExp,
} from './endpoints/transcriptomics';
import { cacheTTL, esHost, keycloakURL, userApiURL } from './env';
import { globalErrorHandler, globalErrorLogger } from './errors';
import {
    STATISTICS_CACHE_ID,
    STATISTICS_PUBLIC_CACHE_ID,
    TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID,
    verifyCache,
} from './middleware/cache';
import { injectBodyHttpHeaders } from './middleware/injectBodyHttpHeaders';
import { resolveSetIdMiddleware } from './middleware/resolveSetIdInSqon';

export default (keycloak: Keycloak, getProject: (projectId: string) => ArrangerProject): Express => {
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

    app.get('/status', (_req, res) => {
        res.send({
            dependencies,
            version,
            keycloak: keycloakURL,
            elasticsearch: esHost,
            users: userApiURL,
            arrangerNext: true,
        });
    });

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

    app.getAsync('/statistics/studies', verifyCache(STATISTICS_PUBLIC_CACHE_ID, cache), async (req, res) => {
        const data = await getStudiesStatistics();
        cache.set(STATISTICS_PUBLIC_CACHE_ID, data);
        res.json(data);
    });

    app.getAsync('/sets', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userSets = await getSets(accessToken);

        res.send(userSets);
    });

    app.postAsync('/sets', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const createdSet = await createSet(req.body as CreateSetBody, accessToken, userId, getProject);

        res.send(createdSet);
    });

    app.putAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
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
    });

    app.deleteAsync('/sets/:setId', keycloak.protect(), async (req, res) => {
        const accessToken = req.headers.authorization;
        const setId: string = req.params.setId;

        const deletedResult = await deleteSet(accessToken, setId);

        res.send(deletedResult);
    });

    app.postAsync('/phenotypes', keycloak.protect(), async (req, res) => {
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
    });

    app.postAsync(
        '/transcriptomics/diffGeneExp',
        [keycloak.protect(), verifyCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID, cache)],
        async (req, res) => {
            const data = await fetchDiffGeneExp();
            cache.set(TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID, data);

            res.json(data);
        },
    );

    app.postAsync('/transcriptomics/sampleGeneExp', keycloak.protect(), async (req, res) => {
        const ensembl_gene_id: string = req.body.ensembl_gene_id;
        const data = await fetchSampleGeneExp(ensembl_gene_id);

        res.json(data);
    });

    app.postAsync('/transcriptomics/facets', keycloak.protect(), async (req, res) => {
        const data = await fetchFacets();

        res.json(data);
    });

    app.postAsync('/transcriptomics/checkSampleIdsAndGene', keycloak.protect(), async (req, res) => {
        const ensembl_gene_id: string = req.body.ensembl_gene_id;
        const sample_ids: string[] = req.body.sample_ids;

        const data = await checkSampleIdsAndGene(sample_ids, ensembl_gene_id);

        res.json(data);
    });

    app.postAsync('/transcriptomics/checkGenesExist', keycloak.protect(), async (req, res) => {
        const genes: string = req.body.genes;

        const data = await checkGenesExist(genes.split(','));

        res.json(data);
    });

    app.postAsync('/authorized-studies', keycloak.protect(), computeAuthorizedStudiesForAllFences);

    app.use(globalErrorLogger, globalErrorHandler);

    return app;
};
