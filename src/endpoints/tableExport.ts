// POST /export — tabular file export for the FE report tables.
//
// Replaces the `/${projectId}/download` route that @arranger/server used to
// provide (dropped with the @arranger/* removal). The FE now owns its column
// definitions and POSTs them here as flat `{ field, header }` pairs, so this
// route is pure ES: translate the SQON with our vendored buildQuery, pull the
// matching rows' _source, project each requested field onto a cell.
//
// Why pure ES (not runInternalQuery): the payload carries flat dotted field
// paths, so reading raw _source + walking the path flattens nested arrays
// deterministically with zero GraphQL-schema coupling. Same buildQuery +
// EsInstance pattern as /upset and /venn.
//
// Response contract: TSV body, Content-Type text/tab-separated-values, served
// as an attachment, 200 (header-only when the result set is empty). Empty/null
// cells render as '--'; multi-values join with ', '. Capped at maxSetContentSize
// rows (matching the product-wide sets ceiling).

import EsInstance from '../ElasticSearchClientInstance.js';
import { maxSetContentSize } from '../env.js';
import buildQuery from '../sqon/buildQuery/index.js';
import { getNestedFieldsForIndex } from '../sqon/getNestedFieldsForIndex.js';
import type { Sqon } from '../sqon/types.js';
import type { SetSqon, Sort } from './sets/setsTypes.js';

// Response headers carrying the truncation signal back to the FE. The body is
// the TSV file itself, so the count can't ride in the body — it goes here. The
// browser only exposes these to the FE's JS if they're listed in CORS
// `Access-Control-Expose-Headers`, so app.ts feeds this same list to cors().
export const EXPORT_HEADERS = {
    totalCount: 'X-Export-Total-Count',
    rowLimit: 'X-Export-Row-Limit',
    truncated: 'X-Export-Truncated',
} as const;

export const EXPORT_EXPOSED_HEADERS = Object.values(EXPORT_HEADERS);

export type ExportColumn = { field: string; header: string };

export type ExportFileType = 'tsv';

export type ExportTableBody = {
    index: string;
    fileName?: string;
    fileType: string;
    sqon?: Sqon;
    sort?: Sort[];
    columns: ExportColumn[];
};

// FE-facing index names → backing ES index is `${index}_centric`. The explicit
// allowlist keeps the route from reading an arbitrary index named in the body.
const SUPPORTED_EXPORT_INDICES = ['study', 'participant', 'file', 'biospecimen'] as const;

export const isSupportedExportIndex = (index: unknown): index is string =>
    typeof index === 'string' && (SUPPORTED_EXPORT_INDICES as readonly string[]).includes(index);

// Strict equality (not an allowlist .includes) — only TSV today. A new format is
// an additive `|| fileType === '...'` here, no route rename. The FE sends an
// explicit fileType so the format is decoupled from the route and the filename.
export const isSupportedFileType = (fileType: unknown): fileType is ExportFileType => fileType === 'tsv';

// How multiple leaf values (an array field, or a path crossing a nested array)
// render inside a single cell. Arranger used ';' for simple array fields and
// ', ' for nested fan-out; we deliberately standardize on ', ' for both.
const MULTI_VALUE_DELIMITER = ', ';

// Placeholder for an empty cell, matching arranger's `valueWhenEmpty`. Arranger
// used a falsy check (`value || '--'`) which wrongly turned 0 and false into
// '--'; we only substitute when there is genuinely no value, so numeric/boolean
// zeros survive.
const EMPTY_PLACEHOLDER = '--';

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [v]);

// Walk a dotted field path through a _source document, following arrays (nested
// or object) at any depth and collecting every leaf value. e.g. on a file,
// `sequencing_experiment.experiment_strategy` fans out across the
// sequencing_experiment array. Mirrors the `$.a.hits.edges[*].node.b` jsonPath
// semantics arranger used, but reads raw _source instead of a GraphQL
// projection — no schema knowledge required.
//
// Each segment is a 3-step pipeline: fan out arrays → keep traversable objects
// → descend one key. A final fan-out flattens leaf arrays.
export const collectLeafValues = (source: unknown, path: string): unknown[] => {
    let nodes: unknown[] = [source];
    for (const segment of path.split('.')) {
        nodes = nodes
            .flatMap(asArray)
            .filter((n): n is Record<string, unknown> => n != null && typeof n === 'object')
            .map(n => n[segment]);
    }
    return nodes.flatMap(asArray).filter(v => v != null);
};

// TSV has no universally honored quoting, so strip the structural characters:
// a stray tab/newline in a value would otherwise shift columns/rows.
const sanitizeCell = (value: string): string => value.replace(/[\t\n\r]+/g, ' ').trim();

const formatCell = (source: Record<string, unknown>, field: string): string => {
    // collectLeafValues already drops null/undefined, so 0 and false survive as
    // "0"/"false" — only a genuinely valueless cell becomes the placeholder.
    const cell = sanitizeCell(
        collectLeafValues(source, field)
            .map(v => String(v))
            .join(MULTI_VALUE_DELIMITER),
    );
    return cell === '' ? EMPTY_PLACEHOLDER : cell;
};

export const buildTsv = (columns: ExportColumn[], rows: Record<string, unknown>[]): string => {
    const headerLine = columns.map(c => sanitizeCell(c.header ?? c.field)).join('\t');
    const dataLines = rows.map(row => columns.map(c => formatCell(row, c.field)).join('\t'));
    return [headerLine, ...dataLines].join('\n');
};

const toEsSort = (sort: Sort[] = []): Record<string, { order: 'asc' | 'desc' }>[] =>
    sort.filter(s => s?.field).map(s => ({ [s.field]: { order: s.order === 'desc' ? 'desc' : 'asc' } }));

// Memoize nested-field paths per backing index (same as venn) — stable for the
// life of the process.
const mNestedFields = new Map<string, string[]>();

export const fetchExportRows = async (
    index: string,
    sqon: SetSqon,
    sort: Sort[],
    columns: ExportColumn[],
): Promise<{ rows: Record<string, unknown>[]; total: number }> => {
    const client = EsInstance.getInstance();
    const indexName = `${index}_centric`;

    if (!mNestedFields.has(indexName)) {
        mNestedFields.set(indexName, await getNestedFieldsForIndex(client, indexName));
    }
    const nestedFields = mNestedFields.get(indexName);

    // Prune _source to the exact dotted paths requested (ES filters the stored
    // _source JSON by path). Pruning to the *leaf* — not its top-level parent —
    // is load-bearing: file/biospecimen docs embed whole `study`/`participant`
    // objects and nested arrays, so pulling the parent for 10k rows ballooned
    // the response past Node's ~512MB max string and the ES client aborted. The
    // nested structure is preserved for collectLeafValues to walk.
    const sourceIncludes = [...new Set(columns.map(c => c.field))];
    const esSort = toEsSort(sort);

    const { body } = await client.search({
        index: indexName,
        size: maxSetContentSize,
        body: {
            track_total_hits: true,
            query: buildQuery({ nestedFields, filters: sqon }),
            _source: sourceIncludes,
            ...(esSort.length ? { sort: esSort } : {}),
        },
    });

    // v1 caps at a single page (maxSetContentSize — the ceiling sets impose
    // product-wide). When the match count exceeds the cap we still return the
    // capped page; the route surfaces the true `total` to the FE via response
    // headers so it can warn the user the file is partial. Also logged for ops
    // visibility. search_after/scroll for unbounded export is a follow-up.
    const total: number = body?.hits?.total?.value ?? 0;
    if (total > maxSetContentSize) {
        console.warn(`[export] ${indexName}: ${total} rows matched, truncating to ${maxSetContentSize}`);
    }

    const rows = body.hits.hits.map((h: { _source: Record<string, unknown> }) => h._source);
    return { rows, total };
};

// Strip anything that isn't filename-safe (also neutralizes header injection via
// the Content-Disposition value).
export const sanitizeFileName = (fileName: string | undefined, index: string): string => {
    const cleaned = (fileName ?? '')
        .trim()
        .replace(/[^\w.-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return cleaned || `${index}-export.tsv`;
};
