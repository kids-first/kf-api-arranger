import type { NextFunction, Request, Response } from 'express';

import { SetNotFoundError } from './endpoints/sets/setError.js';
import { MissingFilterError } from './endpoints/transcriptomics/errors.js';
import { HttpStatus } from './httpStatus.js';

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof SetNotFoundError) {
        res.status(HttpStatus.NOT_FOUND).json({ error: 'Not Found' });
    } else if (err instanceof MissingFilterError) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
    } else {
        // globalErrorLogger has already logged `err` before this handler runs.
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
};

export const globalErrorLogger = (err: unknown, _req: Request, _res: Response, next: NextFunction): void => {
    console.error(err);
    next(err);
};
