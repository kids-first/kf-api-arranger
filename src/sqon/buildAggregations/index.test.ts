import { describe, expect, it } from 'vitest';

import buildAggregations from './index.js';
import createFieldAggregation from './createFieldAggregation.js';
import getNestedSqonFilters from './getNestedSqonFilters.js';
import injectNestedFiltersToAggs from './injectNestedFiltersToAggs.js';
import buildQuery from '../buildQuery/index.js';

// ─── createFieldAggregation ──────────────────────────────────────────

describe('createFieldAggregation', () => {
    it('cardinality on a nested field', () => {
        expect(
            createFieldAggregation({
                field: 'files.fhir_id',
                graphqlField: { cardinality: {} },
                isNested: 1,
            }),
        ).toEqual({
            'files.fhir_id:cardinality': {
                cardinality: { field: 'files.fhir_id', precision_threshold: 40000 },
            },
        });
    });

    it('cardinality on a plain field', () => {
        expect(
            createFieldAggregation({
                field: 'family_id',
                graphqlField: { cardinality: {} },
                isNested: 0,
            }),
        ).toEqual({
            'family_id:cardinality': {
                cardinality: { field: 'family_id', precision_threshold: 40000 },
            },
        });
    });

    it('top_hits as a sub-agg of buckets (non-nested)', () => {
        expect(
            createFieldAggregation({
                field: 'diagnoses.mondo_id',
                graphqlField: {
                    buckets: {
                        key: {},
                        doc_count: {},
                        top_hits: {
                            __arguments: [
                                {
                                    _source: { kind: 'ListValue', value: ['diagnoses.source_text'] },
                                },
                                { size: { kind: 'IntValue', value: 1 } },
                            ],
                        },
                    },
                },
            }),
        ).toEqual({
            'diagnoses.mondo_id': {
                aggs: {
                    'diagnoses.mondo_id.hits': {
                        top_hits: { _source: ['diagnoses.source_text'], size: 1 },
                    },
                },
                terms: { field: 'diagnoses.mondo_id', size: 300000 },
            },
            'diagnoses.mondo_id:missing': {
                missing: { field: 'diagnoses.mondo_id' },
            },
        });
    });

    it('multiple agg types per field (stats + histogram on the same field)', () => {
        expect(
            createFieldAggregation({
                field: 'biospecimens.collection_age',
                graphqlField: {
                    stats: { max: {} },
                    histogram: {
                        buckets: { doc_count: {}, key: {} },
                        __arguments: [{ interval: { kind: 'IntValue', value: '5' } }],
                    },
                },
                isNested: 1,
            }),
        ).toEqual({
            'biospecimens.collection_age:stats': {
                stats: { field: 'biospecimens.collection_age' },
            },
            'biospecimens.collection_age:histogram': {
                histogram: { field: 'biospecimens.collection_age', interval: '5' },
            },
        });
    });

    it('wraps in :nested_filtered when isNested + termFilters present', () => {
        expect(
            createFieldAggregation({
                field: 'samples.cell_type',
                graphqlField: { buckets: { key: {}, doc_count: {} } },
                isNested: 1,
                termFilters: [
                    { terms: { 'samples.collection_method': ['mother'], boost: 0 } },
                    { terms: { 'samples.kf_id': ['SM_X1Y2Z3'], boost: 0 } },
                ],
            }),
        ).toEqual({
            'samples.cell_type:nested_filtered': {
                filter: {
                    bool: {
                        must: [
                            { terms: { 'samples.collection_method': ['mother'], boost: 0 } },
                            { terms: { 'samples.kf_id': ['SM_X1Y2Z3'], boost: 0 } },
                        ],
                    },
                },
                aggs: {
                    'samples.cell_type': {
                        aggs: { rn: { reverse_nested: {} } },
                        terms: { field: 'samples.cell_type', size: 300000 },
                    },
                    'samples.cell_type:missing': {
                        aggs: { rn: { reverse_nested: {} } },
                        missing: { field: 'samples.cell_type' },
                    },
                },
            },
        });
    });

    it('top_hits + filter_by_term combined inside buckets', () => {
        expect(
            createFieldAggregation({
                field: 'diagnoses.mondo_id',
                graphqlField: {
                    buckets: {
                        key: {},
                        doc_count: {},
                        top_hits: {
                            __arguments: [
                                {
                                    _source: {
                                        kind: 'ListValue',
                                        value: ['diagnoses.source_text', 'diagnoses.is_primary'],
                                    },
                                },
                                { size: { kind: 'IntValue', value: 1 } },
                            ],
                        },
                        filter_by_term: {
                            __arguments: [
                                {
                                    filter: {
                                        value: {
                                            op: 'and',
                                            content: [
                                                {
                                                    op: 'in',
                                                    content: {
                                                        field: 'diagnoses.is_primary',
                                                        value: ['true'],
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            }),
        ).toEqual({
            'diagnoses.mondo_id': {
                terms: { field: 'diagnoses.mondo_id', size: 300000 },
                aggs: {
                    'diagnoses.mondo_id.hits': {
                        top_hits: {
                            _source: ['diagnoses.source_text', 'diagnoses.is_primary'],
                            size: 1,
                        },
                    },
                    term_filters: {
                        filter: {
                            bool: {
                                must: [
                                    {
                                        terms: {
                                            'diagnoses.is_primary': ['true'],
                                            boost: 0,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            'diagnoses.mondo_id:missing': {
                missing: { field: 'diagnoses.mondo_id' },
            },
        });
    });
});

// ─── getNestedSqonFilters ────────────────────────────────────────────

describe('getNestedSqonFilters', () => {
    it('extracts filters applied on nested fields, ignoring root-level fields', () => {
        const nestedFields = ['biospecimens', 'biospecimens.diagnoses'];
        const sqon = {
            op: 'and',
            content: [
                { op: 'in', content: { field: 'biospecimens', value: [] } },
                { op: 'in', content: { field: 'biospecimens', value: [] } },
                { op: 'in', content: { field: 'biospecimens.kf_id', value: [] } },
                { op: 'in', content: { field: 'biospecimens.diagnoses.mondo_id', value: [] } },
                { op: 'in', content: { field: 'biospecimens.diagnoses.label', value: [] } },
            ],
        };
        expect(getNestedSqonFilters({ nestedFields, sqon })).toEqual({
            biospecimens: [{ op: 'in', pivot: null, content: { field: 'biospecimens.kf_id', value: [] } }],
            'biospecimens.diagnoses': [
                { op: 'in', pivot: null, content: { field: 'biospecimens.diagnoses.mondo_id', value: [] } },
                { op: 'in', pivot: null, content: { field: 'biospecimens.diagnoses.label', value: [] } },
            ],
        });
    });

    it('handles falsy sqon', () => {
        expect(getNestedSqonFilters({ nestedFields: [], sqon: null })).toEqual({});
    });

    it('walks into nested AND groups', () => {
        expect(
            getNestedSqonFilters({
                nestedFields: ['files'],
                sqon: {
                    op: 'and',
                    pivot: null,
                    content: [
                        {
                            op: 'and',
                            content: [
                                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-abc12345'] } },
                                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-def67890'] } },
                            ],
                        },
                    ],
                },
            }),
        ).toEqual({
            files: [
                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-abc12345'] } },
                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-def67890'] } },
            ],
        });
    });

    it('ignores filters under a matching pivoted group', () => {
        expect(
            getNestedSqonFilters({
                nestedFields: ['files'],
                sqon: {
                    op: 'and',
                    pivot: null,
                    content: [
                        {
                            op: 'and',
                            pivot: 'files',
                            content: [
                                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-abc12345'] } },
                                { op: 'in', pivot: null, content: { field: 'files.fhir_id', value: ['fl-def67890'] } },
                            ],
                        },
                    ],
                },
            }),
        ).toEqual({});
    });
});

// ─── injectNestedFiltersToAggs ───────────────────────────────────────

describe('injectNestedFiltersToAggs', () => {
    it('does not mutate the input aggs', () => {
        const aggs = {
            nested: { path: 'participants' },
            aggs: {
                'subjects.diagnoses.label:nested': {
                    nested: { path: 'participants.diagnoses' },
                    aggs: {
                        'subjects.diagnoses.label': {
                            aggs: { rn: { reverse_nested: {} } },
                            terms: { field: 'subjects.diagnoses.label', size: 300000 },
                        },
                        'subjects.diagnoses.label:missing': {
                            aggs: { rn: { reverse_nested: {} } },
                            missing: { field: 'subjects.diagnoses.label' },
                        },
                    },
                },
            },
        };
        const nestedSqonFilters = {
            'participants.diagnoses': [
                {
                    op: 'in',
                    content: {
                        field: 'subjects.diagnoses.mondo_id',
                        value: ['SOME_VALUE'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'subjects.diagnoses.label',
                        value: ['SOME_VALUE'],
                    },
                },
            ],
        };
        const snapshot = structuredClone(aggs);
        injectNestedFiltersToAggs({ aggs, nestedSqonFilters });
        expect(aggs).toEqual(snapshot);
    });
});

// ─── buildAggregations integration ───────────────────────────────────

describe('buildAggregations integration', () => {
    it('builds nested aggregations for deeply-nested fields with no sqon', () => {
        const nestedFields = [
            'tags',
            'associated_entities',
            'participants',
            'participants.tags',
            'participants.diagnoses',
            'participants.diagnoses.tags',
            'participants.diagnoses.treatments',
            'participants.lifestyle',
            'participants.family_history',
            'participants.biospecimens',
            'participants.biospecimens.tags',
            'participants.biospecimens.samples',
            'participants.biospecimens.samples.tags',
            'participants.biospecimens.samples.aliquots',
            'participants.biospecimens.samples.aliquots.tags',
            'derived_files',
            'derived_files.outputs',
            'study_files',
            'pheno_files',
        ];
        const actual = buildAggregations({
            aggregationsFilterThemselves: false,
            graphqlFields: {
                access: { buckets: { key: {} } },
                participants__biospecimens__samples__cell_type: { buckets: { key: {} } },
                participants__biospecimens__samples__tags__category: { buckets: { key: {} } },
                participants__biospecimens__samples__tags__notes: { buckets: { key: {} } },
            },
            nestedFields,
            query: buildQuery({ nestedFields, filters: {} as any }),
            sqon: null,
        });
        // Spot-check the simpler keys; the deeply-nested one is validated
        // structurally below.
        expect(actual.access).toEqual({ terms: { field: 'access', size: 300000 } });
        expect(actual['access:missing']).toEqual({ missing: { field: 'access' } });

        // Three nested wraps: participants → participants.biospecimens →
        // participants.biospecimens.samples → terms+missing inside.
        const cell = actual['participants.biospecimens.samples.cell_type:nested'];
        expect(cell.nested).toEqual({ path: 'participants' });
        expect(cell.aggs['participants.biospecimens.samples.cell_type:nested'].nested).toEqual({
            path: 'participants.biospecimens',
        });
        const innermost =
            cell.aggs['participants.biospecimens.samples.cell_type:nested'].aggs[
                'participants.biospecimens.samples.cell_type:nested'
            ];
        expect(innermost.nested).toEqual({ path: 'participants.biospecimens.samples' });
        expect(innermost.aggs).toEqual({
            'participants.biospecimens.samples.cell_type:missing': {
                aggs: { rn: { reverse_nested: {} } },
                missing: { field: 'participants.biospecimens.samples.cell_type' },
            },
            'participants.biospecimens.samples.cell_type': {
                aggs: { rn: { reverse_nested: {} } },
                terms: { field: 'participants.biospecimens.samples.cell_type', size: 300000 },
            },
        });
    });

    it('wraps in global+filtered when an outer filter exists on the same field (aggregationsFilterThemselves=false)', () => {
        const nestedFields = ['subjects'];
        const input = {
            aggregationsFilterThemselves: false,
            graphqlFields: { subjects__fhir_id: { buckets: { key: {} } } },
            nestedFields,
            query: {
                bool: {
                    must: [
                        {
                            nested: {
                                path: 'subjects',
                                query: {
                                    bool: {
                                        must: [
                                            {
                                                terms: {
                                                    'subjects.fhir_id': ['sub-111ZZZ11'],
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
            sqon: {
                content: [
                    {
                        content: { field: 'subjects.fhir_id', value: ['sub-111ZZZ11'] },
                        op: 'in',
                    },
                ],
                op: 'and',
            },
        };
        const expected = {
            'subjects.fhir_id:global': {
                global: {},
                aggs: {
                    'subjects.fhir_id:nested': {
                        nested: { path: 'subjects' },
                        aggs: {
                            'subjects:filtered': {
                                filter: { bool: { should: [] } },
                                aggs: {
                                    'subjects.fhir_id:missing': {
                                        aggs: { rn: { reverse_nested: {} } },
                                        missing: { field: 'subjects.fhir_id' },
                                    },
                                    'subjects.fhir_id': {
                                        aggs: { rn: { reverse_nested: {} } },
                                        terms: { field: 'subjects.fhir_id', size: 300000 },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        expect(buildAggregations(input)).toEqual(expected);
    });
});

// ─── perf microbench ─────────────────────────────────────────────────

describe('buildAggregations — perf', () => {
    it('runs the deeply-nested integration fixture under threshold', () => {
        const ITERATIONS = 10_000;
        const nestedFields = [
            'participants',
            'participants.biospecimens',
            'participants.biospecimens.samples',
            'participants.biospecimens.samples.tags',
        ];
        const fixture = {
            aggregationsFilterThemselves: false,
            graphqlFields: {
                access: { buckets: { key: {} } },
                participants__biospecimens__is_proband: { buckets: { key: {} } },
                participants__biospecimens__samples__tags__category: { buckets: { key: {} } },
                participants__biospecimens__samples__tags__notes: { buckets: { key: {} } },
            },
            nestedFields,
            query: buildQuery({ nestedFields, filters: {} as any }),
            sqon: null,
        };

        for (let i = 0; i < 1_000; i++) buildAggregations(fixture);

        const t0 = performance.now();
        for (let i = 0; i < ITERATIONS; i++) buildAggregations(fixture);
        const elapsedMs = performance.now() - t0;
        const perCallUs = (elapsedMs * 1000) / ITERATIONS;

        // eslint-disable-next-line no-console
        console.log(
            `buildAggregations: ${perCallUs.toFixed(2)}µs/call · ` +
                `${elapsedMs.toFixed(1)}ms total over ${ITERATIONS.toLocaleString()} iterations`,
        );

        expect(perCallUs).toBeLessThan(500);
    });
});
