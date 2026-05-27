// SQON ops
export const IN_OP = 'in';
export const NOT_IN_OP = 'not-in';
export const ALL_OP = 'all';
export const SOME_NOT_IN_OP = 'some-not-in';
export const FILTER_OP = 'filter';
export const AND_OP = 'and';
export const OR_OP = 'or';
export const NOT_OP = 'not';
export const GT_OP = 'gt';
export const GTE_OP = 'gte';
export const LT_OP = 'lt';
export const LTE_OP = 'lte';
export const BETWEEN_OP = 'between';

// Special leaf values
export const REGEX = '*';
export const MISSING = '__missing__';
// SET_ID prefix on a leaf value triggers arranger's set-resolution path.
// Dead for us: resolveSetInSqon.ts replaces every set_id reference with
// literal ids before any SQON reaches buildQuery — opSwitch never sees it.

// SQON op aliases (FE-friendly shorthands → canonical op names)
export const OP_ALIASES: Record<string, string> = {
    '>': GT_OP,
    '<': LT_OP,
    '>=': GTE_OP,
    '<=': LTE_OP,
    '=': IN_OP,
    '!=': NOT_IN_OP,
};

export const ARRAY_CONTENT: string[] = [IN_OP, NOT_IN_OP, SOME_NOT_IN_OP, GT_OP, GTE_OP, LT_OP, LTE_OP];

// ES query tag names
export const ES_WILDCARD = 'wildcard';
export const ES_MUST = 'must';
export const ES_MUST_NOT = 'must_not';
export const ES_SHOULD = 'should';
export const ES_NESTED = 'nested';
export const ES_BOOL = 'bool';
export const ES_QUERY = 'query';
export const ES_PATH = 'path';

// Aggregation tag names
export const STATS = 'stats';
export const HISTOGRAM = 'histogram';
export const CARDINALITY = 'cardinality';
export const TOPHITS = 'top_hits';
export const BUCKETS = 'buckets';
export const BUCKET_COUNT = 'bucket_count';
export const AGGS_WRAPPER_GLOBAL = 'global';
export const AGGS_WRAPPER_FILTERED = 'filtered';
export const AGGS_WRAPPER_NESTED = 'nested';
