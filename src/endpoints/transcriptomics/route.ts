import { Router } from 'express';

import {
    TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID,
    TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID,
    TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID,
    updateCache,
    verifyCache,
} from '../../middleware/cache';
import { MissingFilterError } from './errors';
import {
    checkGenesExist,
    checkSampleIdsAndGene,
    exportDiffGeneExp,
    exportSampleGeneExp,
    fetchDiffGeneExp,
    fetchFacets,
    fetchSampleGeneExp,
} from './service';

// Handles requests made to /transcriptomics
const transcriptomicsRouter = Router();

transcriptomicsRouter.post(
    '/diffGeneExp',
    verifyCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID),
    async (_req, res, next) => {
        try {
            const data = await fetchDiffGeneExp();
            updateCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID, data);

            res.json(data);
        } catch (e) {
            next(e);
        }
    },
);

transcriptomicsRouter.get(
    '/diffGeneExp/export',
    verifyCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID),
    async (_req, res, next) => {
        try {
            const data = await exportDiffGeneExp();
            updateCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID, data);

            res.json(data);
        } catch (e) {
            next(e);
        }
    },
);

transcriptomicsRouter.post('/sampleGeneExp', async (req, res, next) => {
    try {
        const ensembl_gene_id: string = req.body.ensembl_gene_id;

        if (ensembl_gene_id === '') {
            throw new MissingFilterError();
        }
        const data = await fetchSampleGeneExp(ensembl_gene_id);

        res.json(data);
    } catch (e) {
        next(e);
    }
});

transcriptomicsRouter.get(
    '/sampleGeneExp/export',
    verifyCache(TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID),
    async (_req, res, next) => {
        try {
            const data = await exportSampleGeneExp();
            updateCache(TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID, data);

            res.json(data);
        } catch (e) {
            next(e);
        }
    },
);

transcriptomicsRouter.post('/facets', async (_req, res, next) => {
    try {
        const data = await fetchFacets();

        res.json(data);
    } catch (e) {
        next(e);
    }
});

transcriptomicsRouter.post('/checkSampleIdsAndGene', async (req, res, next) => {
    try {
        const ensembl_gene_id: string = req.body.ensembl_gene_id;
        const sample_ids: string[] = req.body.sample_ids;

        const data = await checkSampleIdsAndGene(sample_ids, ensembl_gene_id);

        res.json(data);
    } catch (e) {
        next(e);
    }
});

transcriptomicsRouter.post('/checkGenesExist', async (req, res, next) => {
    try {
        const genes: string[] = req.body.genes;

        const data = await checkGenesExist(genes);

        res.json(data);
    } catch (e) {
        next(e);
    }
});

export default transcriptomicsRouter;
