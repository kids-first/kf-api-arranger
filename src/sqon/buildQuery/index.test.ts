import { describe, expect, it } from 'vitest';

import buildQuery from './index.js';
import normalizeFilters from './normalizeFilters.js';

// ─── normalizeFilters ─────────────────────────────────────────────────

describe('normalizeFilters', () => {
    it('handles falsy sqon', () => {
        expect(normalizeFilters(null)).toEqual(null);
    });

    it('preserves pivots on inner filters, defaults parent to null', () => {
        const input = {
            content: [
                {
                    content: { field: 'biospecimens.kf_id', value: ['BS_ABCDE123'] },
                    op: 'in',
                    pivot: 'biospecimens',
                },
            ],
            op: 'and',
        };
        expect(normalizeFilters(input as any)).toEqual({
            content: [
                {
                    content: { field: 'biospecimens.kf_id', value: ['BS_ABCDE123'] },
                    op: 'in',
                    pivot: 'biospecimens',
                },
            ],
            op: 'and',
            pivot: null,
        });
    });

    it('preserves numeric zero values during array coercion', () => {
        expect(
            normalizeFilters({ content: { field: 'age_at_diagnosis', value: 0 }, op: 'gte' } as any),
        ).toEqual({
            content: { field: 'age_at_diagnosis', value: [0] },
            op: 'gte',
            pivot: null,
        });
    });

    it('preserves empty-string values during array coercion', () => {
        expect(
            normalizeFilters({ content: { field: 'family_id', value: '' }, op: 'in' } as any),
        ).toEqual({
            content: { field: 'family_id', value: [''] },
            op: 'in',
            pivot: null,
        });
    });

    it('preserves zero values inside nested groups', () => {
        expect(
            normalizeFilters({
                content: [{ content: { field: 'age_at_diagnosis', value: 0 }, op: 'gte' }],
                op: 'and',
            } as any),
        ).toEqual({
            content: [
                {
                    content: { field: 'age_at_diagnosis', value: [0] },
                    op: 'gte',
                    pivot: null,
                },
            ],
            op: 'and',
            pivot: null,
        });
    });
});

// ─── buildQuery ───────────────────────────────────────────────────────

const cases: Array<{ name: string; input: any; output: any }> = [
    {
        name: 'empty sqon (and with no content)',
        input: { filters: { content: [], op: 'and' } },
        output: { bool: { must: [] } },
    },
    {
        name: 'simple AND with one IN',
        input: {
            filters: {
                content: [{ content: { field: 'study_code', value: ['HTP'] }, op: 'in' }],
                op: 'and',
            },
        },
        output: { bool: { must: [{ terms: { boost: 0, study_code: ['HTP'] } }] } },
    },
    {
        name: 'simple OR with one IN',
        input: {
            filters: {
                content: [{ content: { field: 'study_code', value: ['HTP'] }, op: 'in' }],
                op: 'or',
            },
        },
        output: { bool: { should: [{ terms: { boost: 0, study_code: ['HTP'] } }] } },
    },
    {
        name: 'IN __missing__ negates exists',
        input: {
            filters: {
                op: 'or',
                content: [{ op: 'in', content: { field: 'study_code', value: ['__missing__'] } }],
            },
        },
        output: {
            bool: {
                should: [
                    { bool: { must_not: [{ exists: { boost: 0, field: 'study_code' } }] } },
                ],
            },
        },
    },
    {
        name: 'ALL op (no pivot, no nesting) → AND of per-value IN',
        input: {
            filters: {
                content: [{ content: { field: 'category', value: ['pediatric', 'rare-disease'] }, op: 'all' }],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [
                    {
                        bool: {
                            must: [
                                { terms: { boost: 0, category: ['pediatric'] } },
                                { terms: { boost: 0, category: ['rare-disease'] } },
                            ],
                        },
                    },
                ],
            },
        },
    },
    {
        name: 'ALL op with nested field + matching pivot collapses into one nested envelope',
        input: {
            nestedFields: ['diagnoses'],
            filters: {
                content: [
                    {
                        content: {
                            field: 'diagnoses.mondo_id_diagnosis',
                            value: ['MONDO:0008979', 'MONDO:0021094'],
                        },
                        op: 'all',
                        pivot: 'diagnoses',
                    },
                ],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [
                    {
                        bool: {
                            must: [
                                {
                                    nested: {
                                        path: 'diagnoses',
                                        query: {
                                            bool: {
                                                must: [
                                                    {
                                                        terms: {
                                                            'diagnoses.mondo_id_diagnosis': ['MONDO:0008979'],
                                                            boost: 0,
                                                        },
                                                    },
                                                    {
                                                        terms: {
                                                            'diagnoses.mondo_id_diagnosis': ['MONDO:0021094'],
                                                            boost: 0,
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    },
    {
        name: 'gt range filter',
        input: {
            filters: {
                content: [{ content: { field: 'age_at_diagnosis', value: [10] }, op: 'gt' }],
                op: 'and',
            },
        },
        output: {
            bool: { must: [{ range: { age_at_diagnosis: { boost: 0, gt: 10 } } }] },
        },
    },
    {
        name: 'between range filter',
        input: {
            filters: {
                content: [{ content: { field: 'age_at_diagnosis', value: [10, 50] }, op: 'between' }],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [{ range: { age_at_diagnosis: { boost: 0, gte: 10, lte: 50 } } }],
            },
        },
    },
    {
        name: 'regex (IN with * pattern) becomes ES regexp',
        input: {
            filters: {
                content: [{ content: { field: 'study_code', value: ['HT*'] }, op: 'in' }],
                op: 'and',
            },
        },
        output: {
            bool: { must: [{ regexp: { study_code: 'HT.*' } }] },
        },
    },
    {
        name: 'fuzzy (filter op) groups by nested path',
        input: {
            nestedFields: ['biospecimens'],
            filters: {
                content: { fields: ['biospecimens.label', 'family_id'], value: '*v*' },
                op: 'filter',
            },
        },
        output: {
            bool: {
                should: [
                    {
                        nested: {
                            path: 'biospecimens',
                            query: {
                                bool: {
                                    should: [
                                        {
                                            wildcard: {
                                                'biospecimens.label': { value: '*v*' },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        bool: {
                            should: [
                                {
                                    wildcard: {
                                        family_id: { value: '*v*' },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    },
    {
        name: 'NOT_IN wraps the terms clause in must_not',
        input: {
            filters: {
                content: [{ content: { field: 'study_code', value: ['HTP'] }, op: 'not-in' }],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [{ bool: { must_not: [{ terms: { boost: 0, study_code: ['HTP'] } }] } }],
            },
        },
    },
    {
        name: 'op alias > → gt + scalar value coerced',
        input: {
            filters: {
                content: [{ content: { field: 'age_at_diagnosis', value: 10 }, op: '>' }],
                op: 'and',
            },
        },
        output: {
            bool: { must: [{ range: { age_at_diagnosis: { boost: 0, gt: 10 } } }] },
        },
    },

    // ─── nested coverage ─────────────────────────────────────────────

    {
        name: 'two-leaf AND with two different nested paths (no collapse, two separate envelopes)',
        input: {
            nestedFields: [
                'participants',
                'participants.diagnoses',
                'participants.studies',
                'participants.biospecimens',
            ],
            filters: {
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: {
                            field: 'participants.studies.experimental_strategy',
                            value: ['WGS'],
                        },
                    },
                    {
                        op: 'in',
                        content: {
                            field: 'participants.biospecimens.sample_type',
                            value: ['Tissue'],
                        },
                    },
                ],
            },
        },
        output: {
            bool: {
                must: [
                    {
                        nested: {
                            path: 'participants',
                            query: {
                                bool: {
                                    must: [
                                        {
                                            nested: {
                                                path: 'participants.studies',
                                                query: {
                                                    bool: {
                                                        must: [
                                                            {
                                                                terms: {
                                                                    'participants.studies.experimental_strategy': ['WGS'],
                                                                    boost: 0,
                                                                },
                                                            },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        nested: {
                            path: 'participants',
                            query: {
                                bool: {
                                    must: [
                                        {
                                            nested: {
                                                path: 'participants.biospecimens',
                                                query: {
                                                    bool: {
                                                        must: [
                                                            {
                                                                terms: {
                                                                    'participants.biospecimens.sample_type': ['Tissue'],
                                                                    boost: 0,
                                                                },
                                                            },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    },
    {
        name: '>= range filter on a 2-level-nested field (op alias + nested wrapping)',
        input: {
            nestedFields: ['biospecimens', 'biospecimens.diagnoses'],
            filters: {
                content: [{ content: { field: 'biospecimens.diagnoses.age', value: 7 }, op: '>=' }],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [
                    {
                        nested: {
                            path: 'biospecimens',
                            query: {
                                bool: {
                                    must: [
                                        {
                                            nested: {
                                                path: 'biospecimens.diagnoses',
                                                query: {
                                                    bool: {
                                                        must: [
                                                            { range: { 'biospecimens.diagnoses.age': { boost: 0, gte: 7 } } },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    },

    // ─── wildcard / regex coverage ───────────────────────────────────

    {
        name: 'wildcard with mixed normal+regex values triggers special-filter splitting',
        input: {
            nestedFields: ['biospecimens', 'biospecimens.diagnoses'],
            filters: {
                content: { field: 'participant_id', value: ['PT_*', 'PT_X1Y2Z3'] },
                op: 'in',
            },
        },
        output: {
            bool: {
                should: [
                    { terms: { participant_id: ['PT_X1Y2Z3'], boost: 0 } },
                    { regexp: { participant_id: 'PT_.*' } },
                ],
            },
        },
    },
    {
        name: 'wildcard at a 2-level-nested field with `=` op alias',
        input: {
            nestedFields: ['biospecimens', 'biospecimens.diagnoses'],
            filters: {
                content: [{ content: { field: 'biospecimens.diagnoses.label', value: 'fhir_*' }, op: '=' }],
                op: 'and',
            },
        },
        output: {
            bool: {
                must: [
                    {
                        nested: {
                            path: 'biospecimens',
                            query: {
                                bool: {
                                    must: [
                                        {
                                            nested: {
                                                path: 'biospecimens.diagnoses',
                                                query: {
                                                    bool: {
                                                        must: [{ regexp: { 'biospecimens.diagnoses.label': 'fhir_.*' } }],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    },
];

describe('buildQuery', () => {
    for (const { name, input, output } of cases) {
        it(name, () => {
            expect(buildQuery(input)).toEqual(output);
        });
    }
});

// ─── perf microbench ─────────────────────────────────────────────────

describe('buildQuery — perf', () => {
    it('runs a moderately complex fixture N times under threshold', () => {
        const ITERATIONS = 50_000;
        const fixture = cases[5].input; // ALL op with nested + pivot

        for (let i = 0; i < 1_000; i++) buildQuery(fixture);

        const t0 = performance.now();
        for (let i = 0; i < ITERATIONS; i++) buildQuery(fixture);
        const elapsedMs = performance.now() - t0;
        const perCallUs = (elapsedMs * 1000) / ITERATIONS;

        console.log(
            `buildQuery: ${perCallUs.toFixed(2)}µs/call · ` +
                `${elapsedMs.toFixed(1)}ms total over ${ITERATIONS.toLocaleString()} iterations`,
        );

        expect(perCallUs).toBeLessThan(100);
    });
});
