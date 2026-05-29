// Flatten the global+filtered+nested envelope structure that buildAggregations
// produces into the shape the GraphQL aggregations field returns.
//
// Input keys are either `<field>` or `<field>:<aggType>` where aggType is one
// of stats | histogram | cardinality | missing | (no suffix → bucket terms).
// Output is keyed by field, with buckets remapped, missing folded back into
// the parent (when includeMissing), and nested wrappers recursed into.

import { CARDINALITY, HISTOGRAM, MISSING, STATS } from './constants.js';

type Bucket = Record<string, any>;
type AggValue = {
    buckets?: Bucket[];
    value?: any;
    doc_count?: number;
    [k: string]: any;
};
type Aggregations = Record<string, AggValue>;

const SCALAR_AGG_TYPES = new Set([STATS, HISTOGRAM]);

export function flattenAggregations(args: {
    aggregations: Record<string, unknown>;
    includeMissing?: boolean;
}): Record<string, unknown> {
    const aggregations = args.aggregations as Aggregations;
    const includeMissing = args.includeMissing ?? true;
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(aggregations)) {
        const [field, aggType = null] = key.split(':');

        if (aggType === 'missing') continue;

        if (aggType && SCALAR_AGG_TYPES.has(aggType)) {
            result[field] = { ...result[field], [aggType]: value };
            continue;
        }

        if (aggType === CARDINALITY) {
            result[field] = { ...result[field], [CARDINALITY]: value.value };
            continue;
        }

        if (Array.isArray(value.buckets)) {
            const missing = aggregations[`${field}:missing`];
            const hitsKey = `${field}.hits`;
            const raw: Bucket[] = [
                ...value.buckets,
                ...(includeMissing && missing && (missing.doc_count ?? 0) > 0 ? [{ ...missing, key: MISSING }] : []),
            ];
            const buckets = raw
                .map(({ rn, ...bucket }) => ({
                    ...bucket,
                    doc_count: rn ? rn.doc_count : bucket.doc_count,
                    ...(bucket[hitsKey] ? { top_hits: bucket[hitsKey]?.hits?.hits?.[0]?._source ?? {} } : {}),
                    ...(bucket.term_filters ? { filter_by_term: bucket.term_filters } : {}),
                }))
                .filter(b => b.doc_count);
            result[field] = { bucket_count: buckets.length, buckets };
            continue;
        }

        // No recognized aggType, no buckets → nested wrapper; recurse.
        Object.assign(result, flattenAggregations({ aggregations: value as Aggregations, includeMissing }));
    }
    return result;
}
