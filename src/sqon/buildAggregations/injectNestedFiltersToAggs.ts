// Re-apply SQON filters that target paths under nested aggregation envelopes.
// Without this, a SQON like IN(files.fhir_id, [...]) would aggregate against
// the unfiltered nested sub-document.

import { AGGS_WRAPPER_FILTERED } from '../constants.js';
import { opSwitch } from '../buildQuery/index.js';
import normalizeFilters, { type Filter } from '../buildQuery/normalizeFilters.js';
import type { EsAggs } from '../types.js';

// Builds the output from scratch instead of starting from a deep clone of
// `aggs`. The function never mutates its input, so the clone was overhead at
// every recursive level. Untouched branches are reference-shared with input;
// the immutability test verifies callers don't observe spooky mutation.
export default function injectNestedFiltersToAggs(args: {
    aggs: EsAggs;
    nestedSqonFilters: Record<string, any[]>;
    aggregationsFilterThemselves?: boolean;
}): EsAggs {
    const { aggs, nestedSqonFilters, aggregationsFilterThemselves } = args;
    const recurse = (innerAggs: EsAggs): EsAggs =>
        injectNestedFiltersToAggs({ aggs: innerAggs, nestedSqonFilters, aggregationsFilterThemselves });

    const result: EsAggs = {};
    for (const [aggName, aggContent] of Object.entries(aggs)) {
        if (aggContent?.global || aggContent?.filter) {
            result[aggName] = { ...aggContent, aggs: recurse(aggContent.aggs) };
            continue;
        }

        if (aggContent?.nested) {
            const path: string = aggContent.nested.path;
            const filtersForPath = nestedSqonFilters[path];
            if (filtersForPath) {
                const matching = filtersForPath.filter(
                    sqonFilter =>
                        aggregationsFilterThemselves || aggName.split(':')[0] !== sqonFilter.content.field,
                );
                result[aggName] = {
                    ...aggContent,
                    aggs: {
                        [`${path}:${AGGS_WRAPPER_FILTERED}`]: {
                            filter: {
                                bool: {
                                    should: matching.map(sqonFilter =>
                                        opSwitch({
                                            nestedFields: [],
                                            filter: normalizeFilters(sqonFilter) as Filter,
                                        }),
                                    ),
                                },
                            },
                            aggs: recurse(aggContent.aggs),
                        },
                    },
                };
            } else {
                result[aggName] = { ...aggContent, aggs: recurse(aggContent.aggs) };
            }
            continue;
        }

        // Passthrough — ref-shared with input.
        result[aggName] = aggContent;
    }

    return result;
}
