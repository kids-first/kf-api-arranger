import _lodash from 'lodash';
const { get } = _lodash;

import type { RunInternalQuery } from '../arrangerUtils.js';
import { SetSqon, Sort } from '../endpoints/sets/setsTypes.js';
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

    if (get(results, 'errors', undefined)) {
        throw new Error(get(results, 'errors', undefined));
    }

    const ids: string[] = get(results, `data.${type}.hits.edges`, []).map(edge => edge.node[idField]);

    return ids;
};
