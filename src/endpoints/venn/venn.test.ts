import EsInstance from '../../ElasticSearchClientInstance';
import { getNestedFieldsForIndex } from '../../sqon/getNestedFieldsForIndex';
import { venn } from './venn';

jest.mock('../../ElasticSearchClientInstance');
jest.mock('../../sqon/getNestedFieldsForIndex');

const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

describe('Venn', () => {
    describe(`${venn.name} utils`, () => {
        beforeEach(() => {
            (EsInstance.getInstance as jest.Mock).mockReset();
        });
        it('should generate a response suited for the building of the Venn diagram', async () => {
            (getNestedFieldsForIndex as jest.Mock).mockImplementation(() => [
                'diagnosis',
                'family.relations_to_proband',
                'files',
                'files.biospecimens',
                'files.biospecimens.diagnoses',
                'files.sequencing_experiment',
                'mondo',
                'non_observed_phenotype',
                'observed_phenotype',
                'outcomes',
                'phenotype',
                'study.contacts',
                'study.data_types',
                'study.datasets',
                'study.datasets.publications_details',
                'study.datasets.publications_details.authors',
                'study.experimental_strategies',
                'study.publications_details',
                'study.publications_details.authors',
            ]);

            (EsInstance.getInstance as jest.Mock).mockImplementation(() => ({
                msearch: async () => ({
                    body: {
                        took: 37,
                        responses: [
                            {
                                hits: { total: { value: 530, relation: 'eq' }, max_score: null, hits: [] },
                                status: 200,
                            },
                            {
                                hits: { total: { value: 4695, relation: 'eq' }, max_score: null, hits: [] },
                                status: 200,
                            },
                            {
                                hits: { total: { value: 291, relation: 'eq' }, max_score: null, hits: [] },
                                status: 200,
                            },
                            {
                                hits: { total: { value: 4456, relation: 'eq' }, max_score: null, hits: [] },
                                status: 200,
                            },
                            {
                                hits: { total: { value: 239, relation: 'eq' }, max_score: null, hits: [] },
                                status: 200,
                            },
                        ],
                    },
                    statusCode: 200,
                }),
            }));

            const payload = {
                qbSqons: [
                    {
                        content: [
                            {
                                content: {
                                    field: 'study.study_code',
                                    index: 'participant',
                                    value: ['DS-COG-ALL'],
                                },
                                op: 'in',
                            },
                        ],
                        id: 'fbdd5af9-3ebd-4868-a53e-22887f855605',
                        op: 'and',
                    },
                    {
                        content: [
                            {
                                content: {
                                    field: 'sex',
                                    index: 'participant',
                                    value: ['female'],
                                },
                                op: 'in',
                            },
                        ],
                        id: '9eb50c69-3c78-451b-ae6f-f5fb9020c426',
                        op: 'and',
                    },
                ],
                entitySqons: [
                    {
                        content: [
                            {
                                content: {
                                    field: 'study.study_code',
                                    index: 'participant',
                                    value: ['DS-COG-ALL'],
                                },
                                op: 'in',
                            },
                        ],
                        op: 'and',
                    },
                    {
                        content: [
                            {
                                content: {
                                    field: 'sex',
                                    index: 'participant',
                                    value: ['female'],
                                },
                                op: 'in',
                            },
                        ],
                        op: 'and',
                    },
                ],
                index: 'participant',
            };
            const output = await venn(payload.qbSqons, payload.index);
            expect(output.every(x => isNumber(x.count))).toBeTruthy();
            expect(output.every(x => Object.keys(x.sqon).length > 0)).toBeTruthy();
            expect(output.every(x => ['Q₁', 'Q₂', 'Q₁-Q₂', 'Q₂-Q₁', 'Q₁∩Q₂'].includes(x.operation))).toBeTruthy();
        });
    });
});
