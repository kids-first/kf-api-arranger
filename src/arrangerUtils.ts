import type { ExecutionResult } from 'graphql/execution/execute.js';

type RunQuery = ({ query, variables }: { query: unknown; variables: unknown }) => Promise<ExecutionResult>;

export type ArrangerProject = {
    runQuery: RunQuery;
};
export const runProjectQuery = (project: ArrangerProject): RunQuery => project.runQuery;
