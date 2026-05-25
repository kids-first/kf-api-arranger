import _lodash from 'lodash';
const { get } = _lodash;

import type { RunInternalQuery } from '../arrangerUtils.js';
import { resolveSetIds } from '../sqon/setSqon.js';
import { SetSqon } from './sets/setsTypes.js';

export const idKey = 'fhir_id';

export const getPhenotypesNodes = async (
    sqon: SetSqon,
    runInternalQuery: RunInternalQuery,
    type: string,
    aggregations_filter_themselves: boolean,
    accessToken: string,
) => {
    const resolvedSqon = await resolveSetIds(sqon, accessToken);

    const termFilter = {
        op: 'and',
        content: [
            { op: 'in', content: { field: `${type}.is_tagged`, value: [true] } },
        ],
    };

    const query = `query($sqon: JSON, $term_filters: JSON, $aggregations_filter_themselves: Boolean) {
        participant {
            aggregations(filters: $sqon, aggregations_filter_themselves: $aggregations_filter_themselves) {
                ${type}__name {
                    buckets {
                        key
                        doc_count
                        top_hits(_source: ["${type}.parents"], size: 1)
                        filter_by_term(filter: $term_filters)
                    }
                }
            }
        }
    }`;

    const res = await runInternalQuery({
        query,
        variables: { sqon: resolvedSqon, term_filters: termFilter, aggregations_filter_themselves },
    });
    return get(res, `data.participant.aggregations.${type}__name.buckets`, []);
};
