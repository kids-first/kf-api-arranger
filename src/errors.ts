import { NextFunction, Request, Response } from 'express';

import { SetNotFoundError } from './endpoints/sets/setError.js';
import { MissingFilterError } from './endpoints/transcriptomics/errors.js';

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof SetNotFoundError) {
        res.status(404).json({ error: 'Not Found' });
    } else if (err instanceof MissingFilterError) {
        res.status(400).json({ error: err.message });
    } else if (err instanceof Error) {
        res.status(500).json({ error: 'Internal Server Error' });
    } else {
        // FIXME: throwing here propagates to Node's uncaughtException trap
        // (src/index.ts), which exits the process. A non-Error thrown
        // anywhere in the request pipeline takes the whole server down.
        // Should respond 500 + log instead. See session-9 memory + audit.
        throw err;
    }
};

export const globalErrorLogger = (err: unknown, _req: Request, _res: Response, next: NextFunction): void => {
    console.error(err);
    next(err);
};
