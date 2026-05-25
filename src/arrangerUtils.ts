// In-process GraphQL runner. Internal routes (`/sets`, `/phenotypes`) issue
// queries against our own generated schema without going through Apollo +
// HTTP — a direct `graphql()` call returning the same ExecutionResult shape
// arranger's runQuery used to produce. Single-project deployment: the
// runner closes over schema + ES client at boot, no per-call lookup.

import type { ExecutionResult, GraphQLSchema } from 'graphql';
import { graphql } from 'graphql';
import type { EsClient } from './graphql/es/client.js';

export type RunInternalQuery = (args: {
    query: string;
    variables?: Record<string, unknown>;
}) => Promise<ExecutionResult>;

export function makeRunInternalQuery(schema: GraphQLSchema, es: EsClient): RunInternalQuery {
    return ({ query, variables }) =>
        graphql({
            schema,
            source: query,
            variableValues: variables ?? null,
            contextValue: { es },
        });
}
