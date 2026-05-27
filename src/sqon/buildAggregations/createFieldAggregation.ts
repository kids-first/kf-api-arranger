// Per-field aggregation constructor. Given the graphql-fields selection for
// one field, emit the ES `aggs` block for that field.

import { opSwitch } from '../buildQuery/index.js';
import normalizeFilters, { type Filter } from '../buildQuery/normalizeFilters.js';
import { BUCKET_COUNT, BUCKETS, CARDINALITY, HISTOGRAM, STATS, TOPHITS } from '../constants.js';
import type { EsAggs } from '../types.js';

const MAX_AGGREGATION_SIZE = 300_000;
const HISTOGRAM_INTERVAL_DEFAULT = 1000;
// ES6/ES7 ceiling for cardinality precision_threshold.
const CARDINALITY_DEFAULT_PRECISION_THRESHOLD = 40_000;

type GraphqlField = {
    [k: string]: any;
    __arguments?: Array<Record<string, { value: any; kind?: string }>>;
};

function createNumericAggregation(args: {
    type: typeof STATS | typeof HISTOGRAM;
    field: string;
    graphqlField: GraphqlField;
}): EsAggs {
    const { type, field, graphqlField } = args;
    const typeArgs = graphqlField?.[type]?.__arguments?.[0] ?? {};
    return {
        [`${field}:${type}`]: {
            [type]: {
                field,
                ...(type === HISTOGRAM ? { interval: typeArgs?.interval?.value ?? HISTOGRAM_INTERVAL_DEFAULT } : {}),
            },
        },
    };
}

function createTermAggregation(args: {
    field: string;
    isNested: boolean | number;
    graphqlField: GraphqlField;
    termFilters: any[];
}): EsAggs {
    const { field, isNested, graphqlField, termFilters } = args;
    const maxAggregations: number = graphqlField?.buckets?.__arguments?.[0]?.max?.value ?? MAX_AGGREGATION_SIZE;
    const termFilter = graphqlField?.buckets?.filter_by_term ?? null;
    const topHits = graphqlField?.buckets?.top_hits ?? null;
    const topHitsSource = topHits?.__arguments?.[0]?._source ?? null;
    const topHitsSize = topHits?.__arguments?.[1]?.size ?? 1;

    const innerAggs: EsAggs = {};
    if (isNested) innerAggs.rn = { reverse_nested: {} };
    if (topHits) {
        innerAggs[`${field}.hits`] = {
            top_hits: {
                _source: topHitsSource?.value ?? [],
                size: (topHitsSize as any)?.value,
            },
        };
    }
    if (termFilter) {
        const termsArg = termFilter.__arguments?.[0]?.filter?.value ?? null;
        if (termsArg) {
            const aggsFilters = termsArg.content.map((sqonFilter: any) =>
                opSwitch({ nestedFields: [], filter: normalizeFilters(sqonFilter) as Filter }),
            );
            innerAggs.term_filters = { filter: { bool: { must: aggsFilters } } };
        }
    }

    const aggs: EsAggs = {
        [field]: {
            ...(Object.keys(innerAggs).length > 0 ? { aggs: { ...innerAggs } } : {}),
            terms: { field, size: maxAggregations },
        },
        [`${field}:missing`]: {
            ...(isNested ? { aggs: { rn: { reverse_nested: {} } } } : {}),
            missing: { field },
        },
    };

    if (isNested && termFilters.length > 0) {
        return {
            [`${field}:nested_filtered`]: {
                filter: { bool: { must: termFilters } },
                aggs,
            },
        };
    }
    return aggs;
}

function computeCardinalityAggregation(args: { field: string; graphqlField: GraphqlField }): EsAggs {
    const { field, graphqlField } = args;
    const precision_threshold =
        graphqlField?.[CARDINALITY]?.__arguments?.[0]?.precision_threshold?.value ??
        CARDINALITY_DEFAULT_PRECISION_THRESHOLD;
    return {
        [`${field}:${CARDINALITY}`]: {
            cardinality: { field, precision_threshold },
        },
    };
}

const AGG_TYPE_ORDER = [BUCKETS, STATS, HISTOGRAM, BUCKET_COUNT, CARDINALITY, TOPHITS] as const;

export default function createFieldAggregation(args: {
    field: string;
    graphqlField?: GraphqlField;
    isNested?: boolean | number;
    termFilters?: any[];
}): EsAggs {
    const field = args.field;
    const graphqlField = args.graphqlField ?? {};
    const isNested = args.isNested ?? false;
    const termFilters = args.termFilters ?? [];

    const types = AGG_TYPE_ORDER.filter(t => graphqlField[t]);
    const result: EsAggs = {};
    for (const type of types) {
        if (type === BUCKETS || type === BUCKET_COUNT) {
            Object.assign(result, createTermAggregation({ field, isNested, graphqlField, termFilters }));
        } else if (type === STATS || type === HISTOGRAM) {
            Object.assign(result, createNumericAggregation({ type, field, graphqlField }));
        } else if (type === CARDINALITY) {
            Object.assign(result, computeCardinalityAggregation({ field, graphqlField }));
        }
        // TOPHITS alone (no BUCKETS) is a no-op — top_hits only emits as a
        // sub-agg under createTermAggregation.
    }
    return result;
}
