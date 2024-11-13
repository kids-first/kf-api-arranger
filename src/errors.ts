import { NextFunction, Request, Response } from 'express';
import { ExecutionResult } from 'graphql/execution/execute';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

import { SetNotFoundError } from './endpoints/sets/setError';
import { MissingFilterError } from './endpoints/transcriptomics/errors';

export const globalErrorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof SetNotFoundError) {
        res.status(StatusCodes.NOT_FOUND).json({
            error: getReasonPhrase(StatusCodes.NOT_FOUND),
        });
    } else if (err instanceof MissingFilterError) {
        res.status(StatusCodes.BAD_REQUEST).json({
            error: err.message,
        });
    } else if (err instanceof Error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
        });
    } else {
        throw err;
    }
};

export const globalErrorLogger = (err: unknown, _req: Request, _res: Response, next: NextFunction): void => {
    console.error(err);
    next(err);
};

export const throwErrorsFromGqlQueryIfExist = (resp: ExecutionResult): void | never => {
    if (resp.errors) {
        throw new Error(resp.errors.join(','));
    }
};
