import { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';

export const STATISTICS_CACHE_ID = 'statistics';
export const STATISTICS_PUBLIC_CACHE_ID = 'statistics_studies';
export const TRANSCRIPTOMICS_DIFF_GENE_EXP_CACHE_ID = 'transcriptomics_diff_gene_exp';

export const verifyCache = (cacheId: string, cache: NodeCache) => (
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    try {
        if (cache.has(cacheId)) {
            res.status(200).json(cache.get(cacheId));
        }
        next();
    } catch (err) {
        throw new Error(err);
    }
};
