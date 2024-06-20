import { ExecutionResult } from 'graphql/execution/execute';

type RunQuery = ({ query, variables }: { query: unknown; variables: unknown }) => Promise<ExecutionResult>;

export type ArrangerProject = {
    runQuery: ({ query: string, variables: unknown }) => Promise<ExecutionResult>;
};
export const runProjectQuery = (project: ArrangerProject): RunQuery => project.runQuery;
