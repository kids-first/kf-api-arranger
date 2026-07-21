import type { ExecutionResult } from 'graphql';
import { vi } from 'vitest';
import { resolveSetIds } from '../sqon/setSqon.js';
import { getPhenotypesNodes } from './phenotypes.js';

vi.mock('../sqon/setSqon.js');

// Real FE payload captured against INCLUDE: POST /phenotypes body.
const OBSERVED_PHENOTYPE_PAYLOAD = {
    type: 'observed_phenotype',
    aggregations_filter_themselves: false,
    sqon: {
        op: 'and',
        content: [
            {
                op: 'in',
                content: {
                    field: 'files.file_id',
                    index: 'file',
                    value: ['HTP.001149dc-4fe5-4479-b846-4e4b23aef309.single.vqsr.filtered.vep_105.vcf.gz'],
                },
            },
        ],
    },
};

// Matching buckets the arranger-equivalent path returned for the payload above.
const OBSERVED_PHENOTYPE_BUCKETS = [
    {
        key: 'Abnormal hair morphology (HP:0001595)',
        doc_count: 1,
        top_hits: { parents: ['Abnormal skin adnexa morphology (HP:0011138)'] },
        filter_by_term: { doc_count: 0 },
    },
    {
        key: 'Hypothyroidism (HP:0000821)',
        doc_count: 1,
        top_hits: { parents: ['Abnormality of thyroid physiology (HP:0002926)'] },
        filter_by_term: { doc_count: 1 },
    },
    {
        key: 'Patchy alopecia (HP:0002232)',
        doc_count: 1,
        top_hits: { parents: ['Alopecia (HP:0001596)', 'Acquired abnormal hair pattern (HP:0011360)'] },
        filter_by_term: { doc_count: 1 },
    },
    {
        key: 'Phenotypic abnormality (HP:0000118)',
        doc_count: 1,
        top_hits: { parents: [] },
        filter_by_term: { doc_count: 0 },
    },
];

const MONDO_PAYLOAD = {
    type: 'mondo',
    aggregations_filter_themselves: false,
    sqon: {
        op: 'and',
        content: [
            {
                op: 'in',
                content: {
                    field: 'files.file_id',
                    index: 'file',
                    value: ['HTP.001149dc-4fe5-4479-b846-4e4b23aef309.single.vqsr.filtered.vep_105.vcf.gz'],
                },
            },
        ],
    },
};

const MONDO_BUCKETS = [
    {
        key: 'Down syndrome (MONDO:0008608)',
        doc_count: 1,
        top_hits: { parents: ['chromosome 21 disorder (MONDO:0700124)'] },
        filter_by_term: { doc_count: 0 },
    },
    {
        key: 'complete trisomy 21 (MONDO:0700030)',
        doc_count: 1,
        top_hits: { parents: ['trisomy 21 (MONDO:0700126)'] },
        filter_by_term: { doc_count: 1 },
    },
    {
        key: 'trisomy 21 (MONDO:0700126)',
        doc_count: 1,
        top_hits: { parents: ['Down syndrome (MONDO:0008608)', 'trisomy (MONDO:0700065)'] },
        filter_by_term: { doc_count: 0 },
    },
];

const buildExecutionResult = (type: string, buckets: unknown): ExecutionResult => ({
    data: {
        participant: {
            aggregations: {
                [`${type}__name`]: { buckets },
            },
        },
    },
});

describe('getPhenotypesNodes', () => {
    beforeEach(() => {
        vi.mocked(resolveSetIds).mockReset();
        // No set_ids in the FE payloads — resolveSetIds is a passthrough.
        vi.mocked(resolveSetIds).mockImplementation(async sqon => sqon);
    });

    describe('with the real observed_phenotype FE payload', () => {
        it('forwards the resolved sqon + flags as GraphQL variables and returns the buckets', async () => {
            const runInternalQuery = vi
                .fn()
                .mockResolvedValue(buildExecutionResult(OBSERVED_PHENOTYPE_PAYLOAD.type, OBSERVED_PHENOTYPE_BUCKETS));

            const result = await getPhenotypesNodes(
                OBSERVED_PHENOTYPE_PAYLOAD.sqon,
                runInternalQuery,
                OBSERVED_PHENOTYPE_PAYLOAD.type,
                OBSERVED_PHENOTYPE_PAYLOAD.aggregations_filter_themselves,
                'access_token',
            );

            expect(result).toEqual(OBSERVED_PHENOTYPE_BUCKETS);
            expect(runInternalQuery).toHaveBeenCalledTimes(1);

            const { variables } = runInternalQuery.mock.calls[0][0];
            expect(variables.sqon).toEqual(OBSERVED_PHENOTYPE_PAYLOAD.sqon);
            expect(variables.aggregations_filter_themselves).toBe(false);
            expect(variables.term_filters).toEqual({
                op: 'and',
                content: [{ op: 'in', content: { field: 'observed_phenotype.is_tagged', value: [true] } }],
            });
        });

        it('issues a GraphQL query that selects the observed_phenotype aggregation, top_hits parents and is_tagged sub-bucket', async () => {
            const runInternalQuery = vi
                .fn()
                .mockResolvedValue(buildExecutionResult(OBSERVED_PHENOTYPE_PAYLOAD.type, OBSERVED_PHENOTYPE_BUCKETS));

            await getPhenotypesNodes(
                OBSERVED_PHENOTYPE_PAYLOAD.sqon,
                runInternalQuery,
                OBSERVED_PHENOTYPE_PAYLOAD.type,
                OBSERVED_PHENOTYPE_PAYLOAD.aggregations_filter_themselves,
                'access_token',
            );

            const { query } = runInternalQuery.mock.calls[0][0];
            expect(query).toContain('observed_phenotype__name');
            expect(query).toContain('_source: ["observed_phenotype.parents"]');
            expect(query).toContain('filter_by_term(filter: $term_filters)');
            expect(query).toContain(
                'aggregations(filters: $sqon, aggregations_filter_themselves: $aggregations_filter_themselves)',
            );
        });
    });

    describe('with the real mondo FE payload', () => {
        it('rebuilds the term filter and aggregation field for the mondo type', async () => {
            const runInternalQuery = vi.fn().mockResolvedValue(buildExecutionResult(MONDO_PAYLOAD.type, MONDO_BUCKETS));

            const result = await getPhenotypesNodes(
                MONDO_PAYLOAD.sqon,
                runInternalQuery,
                MONDO_PAYLOAD.type,
                MONDO_PAYLOAD.aggregations_filter_themselves,
                'access_token',
            );

            expect(result).toEqual(MONDO_BUCKETS);

            const { query, variables } = runInternalQuery.mock.calls[0][0];
            expect(query).toContain('mondo__name');
            expect(query).toContain('_source: ["mondo.parents"]');
            expect(query).not.toContain('observed_phenotype');
            expect(variables.term_filters).toEqual({
                op: 'and',
                content: [{ op: 'in', content: { field: 'mondo.is_tagged', value: [true] } }],
            });
        });
    });

    describe('sqon resolution', () => {
        it('calls resolveSetIds with the original sqon + access token and forwards the resolved sqon, not the original', async () => {
            const inputSqon = {
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: {
                            field: 'participant_facet_ids.participant_fhir_id_1',
                            value: ['set_id:e1ef0cb7-a40f-4133-b14c-01fa6b4a23ef'],
                        },
                    },
                ],
            };
            const resolvedSqon = {
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: { field: 'fhir_id', value: ['p1', 'p2'] },
                    },
                ],
            };
            vi.mocked(resolveSetIds).mockReset();
            vi.mocked(resolveSetIds).mockResolvedValue(resolvedSqon);

            const runInternalQuery = vi.fn().mockResolvedValue(buildExecutionResult('observed_phenotype', []));

            await getPhenotypesNodes(inputSqon, runInternalQuery, 'observed_phenotype', false, 'access_token');

            expect(vi.mocked(resolveSetIds)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetIds)).toHaveBeenCalledWith(inputSqon, 'access_token');
            expect(runInternalQuery.mock.calls[0][0].variables.sqon).toBe(resolvedSqon);
        });
    });

    describe('aggregations_filter_themselves flag', () => {
        it('passes true through to the query variables', async () => {
            const runInternalQuery = vi.fn().mockResolvedValue(buildExecutionResult('observed_phenotype', []));
            await getPhenotypesNodes(
                { op: 'and', content: [] },
                runInternalQuery,
                'observed_phenotype',
                true,
                'access_token',
            );
            expect(runInternalQuery.mock.calls[0][0].variables.aggregations_filter_themselves).toBe(true);
        });

        it('passes false through to the query variables', async () => {
            const runInternalQuery = vi.fn().mockResolvedValue(buildExecutionResult('observed_phenotype', []));
            await getPhenotypesNodes(
                { op: 'and', content: [] },
                runInternalQuery,
                'observed_phenotype',
                false,
                'access_token',
            );
            expect(runInternalQuery.mock.calls[0][0].variables.aggregations_filter_themselves).toBe(false);
        });
    });

    describe('defensive defaults', () => {
        it('returns [] when the aggregation buckets are null', async () => {
            const runInternalQuery = vi.fn().mockResolvedValue({
                data: { participant: { aggregations: { observed_phenotype__name: null } } },
            });
            const result = await getPhenotypesNodes(
                { op: 'and', content: [] },
                runInternalQuery,
                'observed_phenotype',
                false,
                'access_token',
            );
            expect(result).toEqual([]);
        });

        it('returns [] when the GraphQL response has no data', async () => {
            const runInternalQuery = vi.fn().mockResolvedValue({ data: null });
            const result = await getPhenotypesNodes(
                { op: 'and', content: [] },
                runInternalQuery,
                'observed_phenotype',
                false,
                'access_token',
            );
            expect(result).toEqual([]);
        });
    });
});
