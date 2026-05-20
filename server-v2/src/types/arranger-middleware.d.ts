// Minimal type declarations for @arranger/middleware.
// The upstream package ships no types. We only declare the surface area
// slice S uses; widen as we wire more functions.

declare module '@arranger/middleware' {
    export function buildQuery(args: { nestedFields: string[]; filters: unknown }): Record<string, unknown>;
    export function buildAggregations(args: unknown): Record<string, unknown>;
    export function flattenAggregations(input: unknown): Record<string, unknown>;
    export function esToSafeJsInt(n: unknown): number;
    export const CONSTANTS: Record<string, string>;
}
