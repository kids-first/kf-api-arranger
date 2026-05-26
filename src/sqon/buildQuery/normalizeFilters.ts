import { AND_OP, ARRAY_CONTENT, IN_OP, MISSING, NOT_IN_OP, NOT_OP, OP_ALIASES, OR_OP, REGEX } from '../constants.js';

// Defensive: set_id leaves should never reach here — resolveSetInSqon
// replaces them before any SQON reaches us. Kept for symmetry with the
// REGEX/MISSING handling in isSpecialFilter below.
const SET_ID_PREFIX = 'set_id:';

export type LeafContent = { field?: string; fields?: string[]; value?: any };
export type Filter = {
    op: string;
    content: LeafContent | Filter[];
    pivot?: string | null;
    [k: string]: unknown;
};

// Ephemeral mark for groupingOptimizer: skip grouping for filters carrying it.
const UNFLAT_KEY = '__unflat__';

function groupingOptimizer({ op, content, pivot }: { op: string; content: Filter[]; pivot?: string | null }): Filter {
    const flattened: Filter[] = [];
    for (const child of content) {
        const f = normalizeFilters(child);
        const samePivot = f.pivot === pivot || !f.pivot;
        if (f.op === op && !(UNFLAT_KEY in f) && samePivot) {
            // Inline same-op same-pivot children one level up.
            for (const inner of f.content as Filter[]) flattened.push(inner);
        } else {
            // Drop the unflat mark on the way out — it's an internal flag.
            const { [UNFLAT_KEY]: _drop, ...rest } = f as Filter & { [UNFLAT_KEY]?: unknown };
            flattened.push(rest as Filter);
        }
    }
    return { op, pivot: pivot ?? null, content: flattened };
}

function isSpecialFilter(value: unknown): boolean {
    const s = `${value}`;
    return s.includes(REGEX) || s.includes(SET_ID_PREFIX) || s.includes(MISSING);
}

// Walk every node, default missing `pivot` to null. Array `content` marks a
// group (recurse into children); object `content` marks a leaf (terminate).
// Structurally tests what each node IS rather than what its value-payload
// happens to be truthy.
function applyDefaultPivots(filter: Filter): Filter {
    const { content, pivot = null } = filter;
    if (Array.isArray(content)) {
        return { ...filter, pivot, content: content.map(applyDefaultPivots) };
    }
    return { ...filter, pivot };
}

function normalizeFilters(filter: Filter): Filter {
    const { op, content } = filter;
    if (!op) throw new Error(`Must specify "op" in filters: ${filter}`);
    if (!content) throw new Error(`Must specify "content" in filters: ${filter}`);

    // Op aliasing: convert FE shorthands (>, =, !=, …) to canonical names.
    if (OP_ALIASES[op]) {
        return normalizeFilters({ ...filter, op: OP_ALIASES[op] });
    }

    const value = (content as LeafContent).value;

    // Coerce scalar `value` to an array for ops that semantically operate on
    // sets. `[].concat(value)` preserves numeric 0 and empty-string.
    if (ARRAY_CONTENT.includes(op) && !Array.isArray(value)) {
        return normalizeFilters({
            ...filter,
            content: { ...(content as LeafContent), value: ([] as any[]).concat(value) },
        });
    }

    // Mixed special+normal leaves (regex / set_id / missing markers among a
    // values list) get split into per-special leaves OR'd with the residual
    // normal-values leaf. Each special routes through its own filter builder.
    if ([IN_OP, NOT_IN_OP].includes(op) && Array.isArray(value) && value.some(isSpecialFilter) && value.length > 1) {
        const specials = value.filter(isSpecialFilter).map(specialValue => ({
            ...filter,
            content: { ...(content as LeafContent), value: [specialValue] },
        }));
        const normals = value.filter(v => !isSpecialFilter(v));
        const filters: Filter[] =
            normals.length > 0
                ? [{ ...filter, content: { ...(content as LeafContent), value: normals } } as Filter, ...(specials as Filter[])]
                : (specials as Filter[]);
        return normalizeFilters({ op: OR_OP, content: filters });
    }

    if ([AND_OP, OR_OP, NOT_OP].includes(op)) {
        return groupingOptimizer({ op, content: content as Filter[], pivot: filter.pivot ?? null });
    }

    return filter;
}

export default function normalize(filter: Filter | null | undefined): Filter | null | undefined {
    return filter ? applyDefaultPivots(normalizeFilters(filter)) : filter;
}
