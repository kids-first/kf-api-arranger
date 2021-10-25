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

export const resolveSetIdMiddleware = () => async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
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
