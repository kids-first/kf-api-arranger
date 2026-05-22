// Real Elasticsearch client adapter. Wraps @elastic/elasticsearch v7
// (talks to KF QA's OpenSearch backend — see pinned-version note below).
// Strips v7's response wrapper (`{ body, statusCode, ... }`) so the
// EsClient interface is identical between mock and real.
//
// IMPORTANT — pinned to @elastic/elasticsearch@7.13.0 (exact). The KF QA
// backend runs OpenSearch (forked from ES 7.10), and @elastic/elasticsearch
// 7.14+ added a "product check" that inspects the X-elastic-product
// response header and deliberately throws ProductNotSupportedError when it
// detects OpenSearch. 7.13.0 predates that check, so it talks to OpenSearch
// without complaint. Search/agg/cluster.health response shapes are identical
// (OpenSearch forked from ES 7.10, same shapes carried forward).
//
// TODO (future-V2 cut-over phase): replace this with the official
// `@opensearch-project/opensearch` client, OR a tiny fetch-based wrapper.
// Either drops the dependency on a deprecated, no-product-check ES client
// pin. The current shim is intentionally stuck on an old version to unblock
// exploration; do not "bump" mindlessly.

import { Client } from '@elastic/elasticsearch';
import type {
    EsClient,
    EsSearchParams,
    EsSearchResponse,
} from './client.js';

function requireEsHost(host?: string): string {
    const h = host ?? process.env.ES_HOST;
    if (!h) {
        throw new Error('ES_HOST is not set. Run with `ES_HOST=https://... npm run dev` (no implicit localhost default).');
    }
    return h;
}

export function createRealEsClient(host?: string): EsClient {
    const node = requireEsHost(host);
    const client = new Client({ node });
    return {
        async search<TSource = Record<string, unknown>>(
            params: EsSearchParams,
        ): Promise<EsSearchResponse<TSource>> {
            const res = await client.search({
                index: params.index,
                body: {
                    size: params.size,
                    from: params.from,
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
// network or auth errors. Also throws if ES_HOST is unset.
export async function pingCluster(host?: string): Promise<string> {
    const client = new Client({ node: requireEsHost(host) });
    const res = await client.cluster.health();
    return res.body.status;
}
