import { Router } from 'express';

import {
    TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID,
    TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID,
    TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID,
    twineWithCache,
} from '../../middleware/cache.js';
import { MissingFilterError } from './errors.js';
import {
    checkGenesExist,
    checkSampleIdsAndGene,
    exportDiffGeneExp,
    exportSampleGeneExp,
    fetchDiffGeneExp,
    fetchFacets,
    fetchSampleGeneExp,
} from './service.js';

// Handles requests made to /transcriptomics
// Express 5 forwards async rejections to globalErrorHandler natively, so
// no per-route try/catch + next(e) wrappers are needed.
const transcriptomicsRouter = Router();

transcriptomicsRouter.post('/diffGeneExp', async (_req, res) => {
    const data = await twineWithCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID, fetchDiffGeneExp);
    res.json(data);
});

transcriptomicsRouter.get('/diffGeneExp/export', async (_req, res) => {
    const data = await twineWithCache(TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID, exportDiffGeneExp);
    res.json(data);
});

transcriptomicsRouter.post('/sampleGeneExp', async (req, res) => {
    const ensembl_gene_id: string = req.body.ensembl_gene_id;

    if (!ensembl_gene_id) {
        throw new MissingFilterError();
    }
    const data = await fetchSampleGeneExp(ensembl_gene_id);

    res.json(data);
});

transcriptomicsRouter.get('/sampleGeneExp/export', async (_req, res) => {
    const data = await twineWithCache(TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID, exportSampleGeneExp);
    res.json(data);
});

transcriptomicsRouter.post('/facets', async (_req, res) => {
    const data = await fetchFacets();
    res.json(data);
});

transcriptomicsRouter.post('/checkSampleIdsAndGene', async (req, res) => {
    const ensembl_gene_id: string = req.body.ensembl_gene_id;
    const sample_ids: string[] = req.body.sample_ids;

    const data = await checkSampleIdsAndGene(sample_ids, ensembl_gene_id);

    res.json(data);
});

transcriptomicsRouter.post('/checkGenesExist', async (req, res) => {
    const genes: string[] = req.body.genes;

    const data = await checkGenesExist(genes);

    res.json(data);
});

export default transcriptomicsRouter;
