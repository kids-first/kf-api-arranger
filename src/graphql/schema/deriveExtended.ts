// Derives a `ParsedProjectDoc`-shaped result from an ES `_mapping` instead of
// reading the legacy `arranger-projects-<projectId>` ES sidecar doc. Pure
// function — no IO. Drop-in compatible with `parseProjectDoc` from
// `extendedMapping.ts` so downstream (`buildConnectionFamily`, resolvers)
// doesn't need to change.
//
// isArray resolution chain, per field path:
//   1. `meta.isArray === "true"` on the field (long-term ETL-owned source).
//   2. node.kind === 'nested'                  (ES nested fields are always JSON arrays).
//   3. arrayFieldsFallback contains the path   (TEMPORARY — see arrayFieldsFallback.ts).
//   4. false.
//
// type values emitted: raw ES type for scalars; "object" / "nested" for
// composite nodes. The arranger doc also curates `keyword` → `"id"` for
// identifier fields (308 such entries in the QA index); we don't apply
// that curation yet — sub-step 4 (equivalence check) will tell us whether
// the FE depends on it.
//
// displayName: title-case of the full dotted path. Matches arranger's
// auto-generated label for fields without a hand-curated displayName
// (e.g. `biospecimen_facet_ids.biospecimen_fhir_id_1` →
// "Biospecimen Facet Ids Biospecimen Fhir Id 1").
//
// columnsState: intentionally `null`. The FE only consumes columnsState as
// a server→FE→server round-trip for /include/download (see Phase C punch
// item #3b — /download redesign drops columnsState entirely). /download is
// already a placeholder on this branch, so any non-null shape here would
// silently swallow the broken export with a 0-column TSV. Returning null
// makes the FE columnsStateQuery null-deref loudly — the desired failure
// mode for a known-unsupported path.

import { getArrayFieldsFallback } from './arrayFieldsFallback.js';
import type { DerivedExtended, ExtendedEntry, ExtendedMap, FieldNode, FieldTree } from './types.js';

export function deriveExtended(esIndex: string, entityName: string, tree: FieldTree): DerivedExtended {
    const fallback = getArrayFieldsFallback(esIndex);
    const entries: ExtendedEntry[] = [];
    const fallbackHits: string[] = [];

    const walk = (fields: FieldNode[], prefix: string): void => {
        for (const f of fields) {
            if (f.kind === 'unsupported') continue;
            const path = prefix ? `${prefix}.${f.name}` : f.name;
            const fromMeta = f.meta?.isArray === 'true';
            const fromNested = f.kind === 'nested';
            const fromFallback = !fromMeta && !fromNested && fallback.has(path);
            const isArray = fromMeta || fromNested || fromFallback;
            if (fromFallback) fallbackHits.push(path);
            entries.push({
                field: path,
                type: typeFor(f),
                isArray,
                active: false,
                displayName: titleCase(path),
                primaryKey: false,
            });
            if (f.kind === 'object' || f.kind === 'nested') walk(f.fields, path);
        }
    };
    walk(tree.fields, '');

    if (fallbackHits.length) {
        console.log(
            `[deriveExtended] ${esIndex}: ${fallbackHits.length} array path(s) came from the ` +
                `hardcoded fallback. ETL should set meta.isArray="true" on: ${fallbackHits.join(', ')}`,
        );
    }

    const map: ExtendedMap = new Map(entries.map(e => [e.field, e]));
    return { map, entries, columnsState: null, entityName };
}

function typeFor(node: FieldNode): string {
    if (node.kind === 'scalar') return node.esType;
    if (node.kind === 'object') return 'object';
    if (node.kind === 'nested') return 'nested';
    return 'unknown';
}

function titleCase(path: string): string {
    return path
        .split(/[._]/)
        .map(s => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
        .join(' ');
}
