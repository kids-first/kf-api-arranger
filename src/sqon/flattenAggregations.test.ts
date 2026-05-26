import { describe, expect, it } from 'vitest';
import { flattenAggregations } from './flattenAggregations.js';

const cases: Array<{ name: string; input: any; output: any }> = [
    {
        name: 'single bucket inside global+filtered wrapper',
        input: {
            'study_code:global': {
                'study_code:filtered': {
                    study_code: {
                        buckets: [{ key: 'HTP', doc_count: 1232 }],
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                    },
                },
            },
        },
        output: {
            study_code: {
                bucket_count: 1,
                buckets: [{ key: 'HTP', doc_count: 1232 }],
            },
        },
    },
    {
        name: 'multi-field with empty missing bucket dropped',
        input: {
            'sex:global': {
                'sex:filtered': {
                    'sex:missing': { doc_count: 0 },
                    sex: {
                        buckets: [
                            { key: 'female', doc_count: 8221 },
                            { key: 'male', doc_count: 7559 },
                        ],
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                    },
                },
            },
            'race:global': {
                'race:filtered': {
                    'race:missing': { doc_count: 0 },
                    race: {
                        buckets: [
                            { key: 'White', doc_count: 11340 },
                            { key: 'Black or African American', doc_count: 1972 },
                            { key: 'Asian', doc_count: 384 },
                            { key: 'More than one race', doc_count: 89 },
                        ],
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                    },
                },
            },
        },
        output: {
            race: {
                bucket_count: 4,
                buckets: [
                    { key: 'White', doc_count: 11340 },
                    { key: 'Black or African American', doc_count: 1972 },
                    { key: 'Asian', doc_count: 384 },
                    { key: 'More than one race', doc_count: 89 },
                ],
            },
            sex: {
                bucket_count: 2,
                buckets: [
                    { key: 'female', doc_count: 8221 },
                    { key: 'male', doc_count: 7559 },
                ],
            },
        },
    },
    {
        name: 'non-empty missing folded into synthetic bucket',
        input: {
            'study_code:global': {
                'study_code:filtered': {
                    study_code: {
                        buckets: [{ key: 'HTP', doc_count: 1232 }],
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                    },
                    'study_code:missing': { doc_count: 3 },
                },
            },
        },
        output: {
            study_code: {
                bucket_count: 2,
                buckets: [
                    { key: 'HTP', doc_count: 1232 },
                    { key: '__missing__', doc_count: 3 },
                ],
            },
        },
    },
    {
        name: 'nested rn wrapper unwrapped, missing folded',
        input: {
            'files.data_type:global': {
                'files.data_type:filtered': {
                    'files.data_type:nested': {
                        'files.data_type:missing': {
                            rn: { doc_count: 12 },
                            doc_count: 4,
                        },
                        'files.data_type': {
                            buckets: [{ rn: { doc_count: 42 }, key: 'Aligned Reads', doc_count: 42 }],
                        },
                        doc_count: 200,
                    },
                    doc_count: 200,
                },
                doc_count: 2000,
            },
        },
        output: {
            'files.data_type': {
                bucket_count: 2,
                buckets: [
                    { key: 'Aligned Reads', doc_count: 42 },
                    { key: '__missing__', doc_count: 12 },
                ],
            },
        },
    },
    {
        name: 'multi-level nested path biospecimens.diagnoses.mondo_id with rn + missing',
        input: {
            'biospecimens.diagnoses.mondo_id:global': {
                'biospecimens.diagnoses.mondo_id:filtered': {
                    biospecimens: {
                        diagnoses: {
                            'biospecimens.diagnoses.mondo_id': {
                                buckets: [{ rn: { doc_count: 88 }, key: 'MONDO:0008979', doc_count: 88 }],
                            },
                            'biospecimens.diagnoses.mondo_id:missing': {
                                rn: { doc_count: 11 },
                                doc_count: 4,
                            },
                            doc_count: 250,
                        },
                        doc_count: 250,
                    },
                    doc_count: 250,
                },
                doc_count: 2500,
            },
        },
        output: {
            'biospecimens.diagnoses.mondo_id': {
                bucket_count: 2,
                buckets: [
                    { key: 'MONDO:0008979', doc_count: 88 },
                    { key: '__missing__', doc_count: 11 },
                ],
            },
        },
    },
    {
        name: 'two nested fields at the same level',
        input: {
            'biospecimens.diagnoses.mondo_id:global': {
                'biospecimens.diagnoses.mondo_id:filtered': {
                    biospecimens: {
                        diagnoses: {
                            'biospecimens.diagnoses.mondo_id': {
                                buckets: [{ rn: { doc_count: 88 }, key: 'MONDO:0008979', doc_count: 88 }],
                            },
                            'biospecimens.diagnoses.mondo_id:missing': {
                                rn: { doc_count: 11 },
                                doc_count: 4,
                            },
                            doc_count: 250,
                        },
                        'biospecimens.sample_type:missing': {
                            rn: { doc_count: 6 },
                            doc_count: 2,
                        },
                        'biospecimens.sample_type': {
                            buckets: [{ rn: { doc_count: 73 }, key: 'Tissue', doc_count: 73 }],
                        },
                        doc_count: 250,
                    },
                    doc_count: 250,
                },
                doc_count: 2500,
            },
        },
        output: {
            'biospecimens.diagnoses.mondo_id': {
                bucket_count: 2,
                buckets: [
                    { key: 'MONDO:0008979', doc_count: 88 },
                    { key: '__missing__', doc_count: 11 },
                ],
            },
            'biospecimens.sample_type': {
                bucket_count: 2,
                buckets: [
                    { key: 'Tissue', doc_count: 73 },
                    { key: '__missing__', doc_count: 6 },
                ],
            },
        },
    },
    {
        name: 'mixed scalar + nested',
        input: {
            'study_code:global': {
                'study_code:filtered': {
                    study_code: {
                        buckets: [{ key: 'HTP', doc_count: 1232 }],
                        doc_count_error_upper_bound: 0,
                        sum_other_doc_count: 0,
                    },
                    'study_code:missing': { doc_count: 0 },
                },
            },
            'biospecimens.diagnoses.mondo_id_global': {
                'biospecimens.diagnoses.mondo_id:filtered': {
                    biospecimens: {
                        'biospecimens.sample_type:missing': {
                            rn: { doc_count: 6 },
                            doc_count: 2,
                        },
                        diagnoses: {
                            'biospecimens.diagnoses.mondo_id': {
                                buckets: [{ rn: { doc_count: 88 }, key: 'MONDO:0008979', doc_count: 88 }],
                            },
                            'biospecimens.diagnoses.mondo_id:missing': {
                                rn: { doc_count: 11 },
                                doc_count: 4,
                            },
                            doc_count: 250,
                        },
                        'biospecimens.sample_type': {
                            buckets: [{ rn: { doc_count: 73 }, key: 'Tissue', doc_count: 73 }],
                        },
                        doc_count: 250,
                    },
                    doc_count: 250,
                },
                doc_count: 2500,
            },
        },
        output: {
            study_code: {
                bucket_count: 1,
                buckets: [{ key: 'HTP', doc_count: 1232 }],
            },
            'biospecimens.diagnoses.mondo_id': {
                bucket_count: 2,
                buckets: [
                    { key: 'MONDO:0008979', doc_count: 88 },
                    { key: '__missing__', doc_count: 11 },
                ],
            },
            'biospecimens.sample_type': {
                bucket_count: 2,
                buckets: [
                    { key: 'Tissue', doc_count: 73 },
                    { key: '__missing__', doc_count: 6 },
                ],
            },
        },
    },
    {
        name: 'includeMissing=false drops the missing bucket even when non-empty',
        input: {
            'study_code:global': {
                'study_code:filtered': {
                    study_code: { buckets: [{ key: 'HTP', doc_count: 1232 }] },
                    'study_code:missing': { doc_count: 3 },
                },
            },
        },
        output: {
            study_code: {
                bucket_count: 1,
                buckets: [{ key: 'HTP', doc_count: 1232 }],
            },
        },
    },
];

describe('flattenAggregations', () => {
    for (const { name, input, output } of cases) {
        it(name, () => {
            const includeMissing = !name.includes('includeMissing=false');
            expect(flattenAggregations({ aggregations: input, includeMissing })).toEqual(output);
        });
    }
});

// Hand-rolled microbench. Avg µs/call printed to vitest output.
describe('flattenAggregations — perf', () => {
    it('runs the largest fixture N times under threshold', () => {
        const ITERATIONS = 50_000;
        const largest = cases[cases.length - 2].input; // mixed scalar + nested

        // Warm-up to dodge JIT noise.
        for (let i = 0; i < 1_000; i++) flattenAggregations({ aggregations: largest });

        const t0 = performance.now();
        for (let i = 0; i < ITERATIONS; i++) flattenAggregations({ aggregations: largest });
        const elapsedMs = performance.now() - t0;
        const perCallUs = (elapsedMs * 1000) / ITERATIONS;

        console.log(
            `flattenAggregations: ${perCallUs.toFixed(2)}µs/call · ` +
                `${elapsedMs.toFixed(1)}ms total over ${ITERATIONS.toLocaleString()} iterations`,
        );

        // Generous ceiling — fails only on egregious regressions.
        expect(perCallUs).toBeLessThan(50);
    });
});
