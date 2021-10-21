import { NextFunction, Request, Response } from 'express';

// This middleware extracts the authorization key from form submissions and
// attaches it on the request header for the middleware to process.
export const injectBodyHttpHeaders = () => (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && req.body.httpHeaders) {
        const httpHeaders = JSON.parse(req.body.httpHeaders);
        Object.entries(httpHeaders).forEach(([key, value]) => {
            req.headers[key] = value as string;
        });
    }
    next();
};
