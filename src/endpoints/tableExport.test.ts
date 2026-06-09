import { vi } from 'vitest';
import EsInstance from '../ElasticSearchClientInstance.js';
import { getNestedFieldsForIndex } from '../sqon/getNestedFieldsForIndex.js';
import {
    buildTsv,
    collectLeafValues,
    fetchExportRows,
    isSupportedExportIndex,
    isSupportedFileType,
    sanitizeFileName,
} from './tableExport.js';

vi.mock('../ElasticSearchClientInstance.js');
vi.mock('../sqon/getNestedFieldsForIndex.js');

// Shape of the single argument fetchExportRows passes to client.search(...).
// Typing the mock impl's param makes search.mock.calls[0][0] infer as this
// object rather than `undefined` (an untyped `() => ...` has no params, so the
// call tuple is empty) — without it the IDE flags arg/arg.body as possibly
// undefined even though tsc skips test files.
type EsSearchArg = { index: string; size: number; body: Record<string, unknown> };

describe('tableExport', () => {
    describe(`${isSupportedExportIndex.name}`, () => {
        it('accepts the four supported indices', () => {
            for (const i of ['study', 'participant', 'file', 'biospecimen']) {
                expect(isSupportedExportIndex(i)).toBe(true);
            }
        });

        it('rejects unknown indices, the backing _centric name, non-strings and missing values', () => {
            expect(isSupportedExportIndex('variant')).toBe(false);
            expect(isSupportedExportIndex('study_centric')).toBe(false);
            expect(isSupportedExportIndex(undefined)).toBe(false);
            expect(isSupportedExportIndex(42)).toBe(false);
        });
    });

    describe(`${isSupportedFileType.name}`, () => {
        it('accepts only "tsv"', () => {
            expect(isSupportedFileType('tsv')).toBe(true);
        });

        it('rejects other (incl. wrong-case) or missing fileTypes', () => {
            expect(isSupportedFileType('csv')).toBe(false);
            expect(isSupportedFileType('TSV')).toBe(false);
            expect(isSupportedFileType(undefined)).toBe(false);
        });
    });

    describe(`${collectLeafValues.name}`, () => {
        it('reads a flat scalar field', () => {
            expect(collectLeafValues({ study_code: 'ST1' }, 'study_code')).toEqual(['ST1']);
        });

        it('reads a nested object path', () => {
            expect(collectLeafValues({ study: { study_code: 'ST1' } }, 'study.study_code')).toEqual(['ST1']);
        });

        it('fans out across an array path', () => {
            const src = { sequencing_experiment: [{ experiment_strategy: 'WGS' }, { experiment_strategy: 'WXS' }] };
            expect(collectLeafValues(src, 'sequencing_experiment.experiment_strategy')).toEqual(['WGS', 'WXS']);
        });

        it('flattens an array-of-scalars leaf', () => {
            expect(collectLeafValues({ domains: ['a', 'b'] }, 'domains')).toEqual(['a', 'b']);
        });

        it('returns [] for missing intermediates', () => {
            expect(collectLeafValues({}, 'study.study_code')).toEqual([]);
        });

        it('drops null/undefined but keeps 0 and false', () => {
            expect(collectLeafValues({ a: null }, 'a')).toEqual([]);
            expect(collectLeafValues({ a: 0 }, 'a')).toEqual([0]);
            expect(collectLeafValues({ a: false }, 'a')).toEqual([false]);
        });
    });

    describe(`${buildTsv.name}`, () => {
        const cols = [
            { field: 'study_code', header: 'Study Code' },
            { field: 'domains', header: 'Domains' },
        ];

        it('emits a header-only row when there are no data rows', () => {
            expect(buildTsv(cols, [])).toBe('Study Code\tDomains');
        });

        it('joins multi-value cells with ", "', () => {
            const rows = [{ study_code: 'ST1', domains: ['Neuro', 'Cardio'] }];
            expect(buildTsv(cols, rows)).toBe('Study Code\tDomains\nST1\tNeuro, Cardio');
        });

        it('renders -- for empty/null cells but keeps 0 and false', () => {
            const c = [
                { field: 'a', header: 'A' },
                { field: 'b', header: 'B' },
                { field: 'c', header: 'C' },
            ];
            expect(buildTsv(c, [{ a: null, b: 0, c: false }])).toBe('A\tB\tC\n--\t0\tfalse');
        });

        it('sanitizes tabs/newlines out of cells', () => {
            expect(buildTsv([{ field: 'a', header: 'A' }], [{ a: 'x\ty\nz' }])).toBe('A\nx y z');
        });
    });

    describe(`${sanitizeFileName.name}`, () => {
        it('keeps a well-formed .tsv name', () => {
            expect(sanitizeFileName('include-study-table-2026-06-08.tsv', 'study')).toBe(
                'include-study-table-2026-06-08.tsv',
            );
        });

        it('falls back to <index>-export.tsv when empty or undefined', () => {
            expect(sanitizeFileName('', 'study')).toBe('study-export.tsv');
            expect(sanitizeFileName(undefined, 'file')).toBe('file-export.tsv');
        });

        it('replaces unsafe characters, including header-injection attempts', () => {
            expect(sanitizeFileName('a b/c"d', 'study')).toBe('a_b_c_d');
            expect(sanitizeFileName('x"\r\nSet-Cookie: y.tsv', 'study')).toBe('x_Set-Cookie_y.tsv');
        });
    });

    describe(`${fetchExportRows.name}`, () => {
        beforeEach(() => {
            vi.mocked(EsInstance.getInstance).mockReset();
            vi.mocked(getNestedFieldsForIndex).mockResolvedValue([]);
        });

        it('queries <index>_centric, prunes _source to the exact dotted paths, maps sort, returns _source rows', async () => {
            const search = vi.fn(async (_arg: EsSearchArg) => ({
                body: { hits: { total: { value: 1, relation: 'eq' }, hits: [{ _source: { study_code: 'ST1' } }] } },
            }));
            vi.mocked(EsInstance.getInstance).mockImplementation(() => ({ search }));

            const { rows, total } = await fetchExportRows(
                'study',
                { op: 'and', content: [] },
                [{ field: 'study_code', order: 'asc' }],
                [
                    { field: 'study.study_code', header: 'S' },
                    { field: 'study_code', header: 'C' },
                ],
            );

            expect(rows).toEqual([{ study_code: 'ST1' }]);
            expect(total).toBe(1);

            const arg = search.mock.calls[0][0];
            expect(arg.index).toBe('study_centric');
            expect(arg.body._source).toEqual(['study.study_code', 'study_code']);
            expect(arg.body.sort).toEqual([{ study_code: { order: 'asc' } }]);
        });

        it('omits sort when none is given', async () => {
            const search = vi.fn(async (_arg: EsSearchArg) => ({
                body: { hits: { total: { value: 0, relation: 'eq' }, hits: [] } },
            }));
            vi.mocked(EsInstance.getInstance).mockImplementation(() => ({ search }));

            await fetchExportRows('file', { op: 'and', content: [] }, [], [{ field: 'file_id', header: 'File ID' }]);

            expect(search.mock.calls[0][0].body.sort).toBeUndefined();
        });

        it('warns, reports the true total, and still returns the capped page when the match count exceeds the cap', async () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const search = vi.fn(async (_arg: EsSearchArg) => ({
                body: { hits: { total: { value: 10001, relation: 'gte' }, hits: [{ _source: { a: 1 } }] } },
            }));
            vi.mocked(EsInstance.getInstance).mockImplementation(() => ({ search }));

            const { rows, total } = await fetchExportRows(
                'participant',
                { op: 'and', content: [] },
                [],
                [{ field: 'a', header: 'A' }],
            );

            expect(rows).toEqual([{ a: 1 }]);
            expect(total).toBe(10001);
            expect(warn).toHaveBeenCalledTimes(1);
            warn.mockRestore();
        });
    });
});
