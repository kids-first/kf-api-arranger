// Minimal interface over @elastic/elasticsearch v8/v9 search.
// Both the mock and the real client implement this so swapping
// is a one-line constructor change in index.ts.

export type EsHit<TSource = Record<string, unknown>> = {
    _id: string;
    _score?: number | null;
    _source: TSource;
    sort?: unknown[];
};

export type EsSearchResponse<TSource = Record<string, unknown>> = {
    hits: {
        total: { value: number; relation: 'eq' | 'gte' };
        hits: EsHit<TSource>[];
    };
    aggregations?: Record<string, unknown>;
};

export type EsSearchParams = {
    index: string;
    size?: number;
    from?: number;
    query?: unknown;
    sort?: unknown;
    search_after?: unknown[];
    track_total_hits?: boolean;
    aggregations?: Record<string, unknown>;
};

// ES _mapping response shape. For aliases that fan out to multiple backing
// indices (production pattern: <index>_<study>_<release>), ES returns one
// entry per backing index — all share the same logical mapping for our
// per-study/per-release sharding scheme, so the caller picks any one.
export type EsMappingResponse = {
    [indexName: string]: {
        mappings: {
            properties: Record<string, unknown>;
        };
    };
};

export interface EsClient {
    search<TSource = Record<string, unknown>>(params: EsSearchParams): Promise<EsSearchResponse<TSource>>;
    getMapping(index: string): Promise<EsMappingResponse>;
}
