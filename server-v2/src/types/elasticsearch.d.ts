// Minimal ambient typings for @elastic/elasticsearch.
// The 7.13.0 pin (see realClient.ts header) doesn't declare a `types` export
// in its package.json, so under `moduleResolution: bundler` TS can't find the
// d.ts files even though they ship in node_modules. Rather than relax
// moduleResolution for the whole project, declare only the surface we use.

declare module '@elastic/elasticsearch' {
    type ClientOptions = { node: string };

    type SearchParams = {
        index: string;
        body?: Record<string, unknown>;
    };

    type Response<TBody> = { body: TBody; statusCode?: number; headers?: Record<string, unknown> };

    type SearchResponseBody = {
        hits: {
            hits: Array<Record<string, unknown>>;
            total: { value: number; relation?: string } | number;
        };
        aggregations?: Record<string, unknown>;
    };

    type ClusterHealthBody = { status: 'green' | 'yellow' | 'red' };

    type GetMappingParams = { index: string };
    type GetMappingBody = Record<string, { mappings: { properties: Record<string, unknown> } }>;

    export class Client {
        constructor(opts: ClientOptions);
        search<TBody = SearchResponseBody>(params: SearchParams): Promise<Response<TBody>>;
        cluster: {
            health(): Promise<Response<ClusterHealthBody>>;
        };
        indices: {
            getMapping(params: GetMappingParams): Promise<Response<GetMappingBody>>;
        };
    }
}
