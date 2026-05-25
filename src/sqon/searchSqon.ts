import type { RunInternalQuery } from '../arrangerUtils.js';
import type { SetSqon, Sort } from '../endpoints/sets/setsTypes.js';
import { maxSetContentSize } from '../env.js';

export const searchSqon = async (
    sqon: SetSqon,
    type: string,
    sort: Sort[],
    idField: string,
    runInternalQuery: RunInternalQuery,
): Promise<string[]> => {
    const results = await runInternalQuery({
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

    if (results?.errors) {
        throw new Error(String(results.errors));
    }

    const edges = ((results?.data as any)?.[type]?.hits?.edges ?? []) as Array<{ node: Record<string, string> }>;
    return edges.map(edge => edge.node[idField]);
};
