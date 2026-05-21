// Real Elasticsearch client adapter. Wraps @elastic/elasticsearch v7
// (matching the local ES 7.17.0 server). Strips v7's response wrapper
// (`{ body, statusCode, ... }`) so the EsClient interface is identical
// between mock and real.

import { Client } from '@elastic/elasticsearch';
import type {
    EsClient,
    EsSearchParams,
    EsSearchResponse,
} from './client.js';

const DEFAULT_HOST = 'http://localhost:9200';

export function createRealEsClient(host: string = process.env.ES_HOST ?? DEFAULT_HOST): EsClient {
    const client = new Client({ node: host });
    return {
        async search<TSource = Record<string, unknown>>(
            params: EsSearchParams,
        ): Promise<EsSearchResponse<TSource>> {
            const res = await client.search({
                index: params.index,
                body: {
                    size: params.size,
                    query: params.query,
                    sort: params.sort,
                    search_after: params.search_after,
                    track_total_hits: params.track_total_hits,
                    aggs: params.aggregations,
                },
            });
            return res.body as EsSearchResponse<TSource>;
        },
    };
}

// Health-check helper — call at startup to fail fast if ES is unreachable.
// Returns the cluster status string (green/yellow/red) on success; throws on
// network or auth errors.
export async function pingCluster(host: string = process.env.ES_HOST ?? DEFAULT_HOST): Promise<string> {
    const client = new Client({ node: host });
    const res = await client.cluster.health();
    return res.body.status;
}
