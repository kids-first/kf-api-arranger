import { resolveSetsInSqon } from '../sqon/resolveSetInSqon';
import { ArrangerProject } from '../sqon/searchSqon';
import { SetSqon } from './sets/setsTypes';

export type SearchVariables = {
    sqon?: SetSqon;
};

export type SearchPayload = {
    variables?: SearchVariables;
    projectId: string;
    query: string;
};

export const search = async (
    userId: string,
    accessToken: string,
    projectId: string,
    query: string,
    variables: SearchVariables,
    getProject: (projectId: string) => ArrangerProject,
): Promise<unknown> => {
    let variablesAfterReplace = variables;
    if (variables && variables.sqon) {
        const sqonAfterReplace = await resolveSetsInSqon(variables.sqon, userId, accessToken);
        variablesAfterReplace = { ...variables, sqon: sqonAfterReplace };
    }
    const project = getProject(projectId);
    if (!project) {
        throw new Error(`ProjectID '${projectId}' cannot be established.`);
    }
    return project.runQuery({ query, variables: variablesAfterReplace });
};
