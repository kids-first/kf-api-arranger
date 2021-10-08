import { get } from 'lodash';

import { SetSqon, Sort } from '../endpoints/sets/setsTypes';
import { maxSetContentSize } from '../env';

export type ArrangerProject = {
    runQuery: ({ query: string, variables: unknown }) => Promise<unknown>;
};
export const searchSqon = async (
    sqon: SetSqon,
    projectId: string,
    type: string,
    sort: Sort[],
    idField: string,
    getProject: (projectId: string) => ArrangerProject,
): Promise<string[]> => {
    const project = getProject(projectId);

    if (!project) {
        throw new Error(`ProjectID '${projectId}' cannot be established.`);
    }

    const results = await project.runQuery({
        query: `
            query ($sqon: JSON, $sort: [Sort], $first: Int) {
                ${type} {
                    hits(filters: $sqon, sort: $sort, first: $first) {
                        edges {
                            node {
                                ${idField}
                            }
                        }
                    }
                }
            }
        `,
        variables: { sqon, sort, first: maxSetContentSize },
    });

    if (get(results, 'errors', undefined)) {
        throw new Error(get(results, 'errors', undefined));
    }

    return get(results, `data.${type}.hits.edges`, []).map(edge => edge.node.kf_id);
};
