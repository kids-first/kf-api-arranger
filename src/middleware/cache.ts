import NodeCache from 'node-cache';

import { cacheTTL } from '../env.js';

export const STATISTICS_CACHE_ID = 'statistics';
export const STATISTICS_PUBLIC_CACHE_ID = 'statistics_studies';
export const TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID = 'transcriptomics_diff_gene_exp';
export const TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID = 'transcriptomics_diff_gene_exp_export_url';
export const TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID = 'transcriptomics_sample_gene_exp_export_url';

const cache = new NodeCache({ stdTTL: cacheTTL });

export const flushAllCache = (): void => {
    cache.flushAll();
};

export const twineWithCache = async (cacheId: string, fetcher: () => Promise<unknown>) => {
    const cData = cache.get(cacheId);
    if (cData) {
        return cData;
    }
    const data = await fetcher();
    cache.set(cacheId, data);
    return data;
};
