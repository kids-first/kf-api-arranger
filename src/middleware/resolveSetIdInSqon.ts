import { NextFunction, Request, Response } from 'express';

import { SetSqon, Sort } from '../endpoints/sets/setsTypes';
import { resolveSetsInSqon } from '../sqon/resolveSetInSqon';

type File = {
    fileName: string;
    sqon: SetSqon;
    index: string;
    sort: Sort[];
    columns: unknown[];
};

export type SearchVariables = {
    sqon?: SetSqon;
};

export type SearchPayload = {
    variables?: SearchVariables;
    projectId: string;
    query: string;
};

export const resolveSetIdMiddleware = () => async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (req.body && req.body.variables) {
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const accessToken = req.headers.authorization;
        const searchPayloadAfterReplace = await resolveSetIdForSearchPayload(req.body, userId, accessToken);
        req.body = searchPayloadAfterReplace;
    }

    if (req.body && Array.isArray(req.body)) {
        const searchBody: SearchPayload[] = req.body;
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const accessToken = req.headers.authorization;
        const searchPayloadAfterReplace = await Promise.all(
            searchBody.map(searchPayload => resolveSetIdForSearchPayload(searchPayload, userId, accessToken)),
        );
        req.body = searchPayloadAfterReplace;
    }

    if (req.body && req.body.params) {
        const params = JSON.parse(req.body.params);
        const files = params.files || [];
        const userId = req['kauth']?.grant?.access_token?.content?.sub;
        const accessToken = req.headers.authorization;
        const filesUpdated = await Promise.all(
            files.map((file: File) => resolveSetIdForFile(file, userId, accessToken)),
        );
        req.body.params = JSON.stringify({ ...params, files: filesUpdated });
    }
    next();
};

const resolveSetIdForFile = async (file: File, userId: string, accessToken: string): Promise<File> => {
    const sqonWithResolveSetsId = await resolveSetsInSqon(file.sqon, userId, accessToken);
    return {
        ...file,
        sqon: sqonWithResolveSetsId,
    };
};

const resolveSetIdForSearchPayload = async (
    searchPayload: SearchPayload,
    userId: string,
    accessToken: string,
): Promise<SearchPayload> => {
    let variablesAfterReplace = searchPayload.variables;
    if (searchPayload.variables && searchPayload.variables.sqon) {
        const sqonAfterReplace = await resolveSetsInSqon(searchPayload.variables.sqon, userId, accessToken);
        variablesAfterReplace = { ...searchPayload.variables, sqon: sqonAfterReplace };
    }
    return {
        ...searchPayload,
        variables: variablesAfterReplace,
    };
};
