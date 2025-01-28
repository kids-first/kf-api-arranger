import { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';

import { cacheTTL } from '../env';

export const STATISTICS_CACHE_ID = 'statistics';
export const STATISTICS_PUBLIC_CACHE_ID = 'statistics_studies';
export const TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID = 'transcriptomics_diff_gene_exp';
export const TRANSCRIPTOMICS_DIFF_GENE_EXP_EXPORT_URL_CACHE_ID = 'transcriptomics_diff_gene_exp_export_url';
export const TRANSCRIPTOMICS_SAMPLE_GENE_EXP_EXPORT_URL_CACHE_ID = 'transcriptomics_sample_gene_exp_export_url';

const cache = new NodeCache({ stdTTL: cacheTTL });

// Warning: If used as a handler on a route, it can make the route sends two responses if not used carefully
// It can create errors such as: "Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client"
/** @deprecated */
export const verifyCache = (cacheId: string) => (_req: Request, res: Response, next: NextFunction): void => {
    try {
        if (cache.has(cacheId)) {
            res.status(200).json(cache.get(cacheId));
        }
        next();
    } catch (err) {
        throw new Error(err);
    }
};

export const updateCache = (cacheId: string, data: unknown): void => {
    cache.set(cacheId, data);
};

export const flushAllCache = (): void => {
    cache.flushAll();
};

export const getFromCache = (cacheId: string) => cache.get(cacheId);

export const twineWithCache = async (cacheId: string, fetcher: () => Promise<unknown>) => {
    const cData = cache.get(cacheId);
    if (cData) {
        return cData;
    }
    const data = await fetcher();
    updateCache(cacheId, data);
    return data;
};
