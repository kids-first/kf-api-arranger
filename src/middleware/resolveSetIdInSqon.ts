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
    const userId = req['kauth']?.grant?.access_token?.content?.sub;
    const accessToken = req.headers.authorization;
    if (req.body && req.body.variables) {
        req.body = await resolveSetIdForSearchPayload(req.body, userId, accessToken);
    }

    if (req.body && Array.isArray(req.body)) {
        const searchBody: SearchPayload[] = req.body;
        req.body = await Promise.all(
            searchBody.map(searchPayload => resolveSetIdForSearchPayload(searchPayload, userId, accessToken)),
        );
    }

    if (req.body && req.body.params) {
        const params = JSON.parse(req.body.params);
        const files = params.files || [];
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

const sqonNameRegex = /^.*_{0,1}sqon$/;

const resolveSetIdForSearchPayload = async (
    searchPayload: SearchPayload,
    userId: string,
    accessToken: string,
): Promise<SearchPayload> => {
    let variablesAfterReplace = searchPayload.variables;

    const variablesKeys = Object.keys(searchPayload.variables);
    const originalVariables = searchPayload.variables;

    const isSqonKey = key => sqonNameRegex.test(key); // rename it to fit your needs
    for (const key of variablesKeys) {
        const newSqonForKey = isSqonKey
            ? await resolveSetsInSqon(searchPayload.variables[key], userId, accessToken)
            : originalVariables[key];
        variablesAfterReplace = { ...variablesAfterReplace, [key]: newSqonForKey };
    }

    return {
        ...searchPayload,
        variables: variablesAfterReplace,
    };
};
