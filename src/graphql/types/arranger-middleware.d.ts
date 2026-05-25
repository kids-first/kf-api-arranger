// Minimal type declarations for @arranger/middleware.
// The upstream package ships no types. We declare the surface area server-v2
// uses; widen as more functions are consumed.

declare module '@arranger/middleware' {
    import type { FieldsTree } from 'graphql-fields';

    export function buildQuery(args: { nestedFields: string[]; filters: unknown }): Record<string, unknown>;

    export function buildAggregations(args: {
        sqon: unknown;
        graphqlFields: FieldsTree;
        nestedFields: string[];
        aggregationsFilterThemselves?: boolean;
        query?: Record<string, unknown>;
    }): Record<string, unknown>;

    export function flattenAggregations(args: {
        aggregations: Record<string, unknown>;
        includeMissing?: boolean;
    }): Record<string, unknown>;

    export function esToSafeJsInt(n: unknown): number;

    export const CONSTANTS: Record<string, string>;
}
