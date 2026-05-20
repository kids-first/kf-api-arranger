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
};

export type EsSearchParams = {
    index: string;
    size?: number;
    query?: unknown;
    sort?: unknown;
    search_after?: unknown[];
    track_total_hits?: boolean;
};

export interface EsClient {
    search<TSource = Record<string, unknown>>(
        params: EsSearchParams,
    ): Promise<EsSearchResponse<TSource>>;
}
