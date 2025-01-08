import EsInstance from '../ElasticSearchClientInstance';
import { buildSteps, computeUpset, countIt, topN } from './upset';

jest.mock('../ElasticSearchClientInstance');

const MOCK_ES_PARTICIPANT_MAPPINGS = {
    statusCode: 200,
    meta: {},
    body: {
        participant_centric_test: {
            mappings: {
                properties: {
                    diagnosis: {
                        type: 'nested',
                        properties: {
                            diagnosis_id: {
                                type: 'keyword',
                            },
                        },
                    },
                    down_syndrome_status: {
                        type: 'keyword',
                    },
                    family: {
                        properties: {
                            relations_to_proband: {
                                type: 'nested',
                                properties: {
                                    participant_id: {
                                        type: 'keyword',
                                    },
                                },
                            },
                        },
                    },

                    fhir_id: {
                        type: 'keyword',
                    },
                    files: {
                        type: 'nested',
                        properties: {
                            biospecimens: {
                                type: 'nested',
                                properties: {
                                    diagnoses: {
                                        type: 'nested',
                                        properties: {
                                            diagnosis_mondo: {
                                                type: 'keyword',
                                            },
                                        },
                                    },
                                },
                            },
                            sequencing_experiment: {
                                type: 'nested',
                                properties: {
                                    experiment_strategy: {
                                        type: 'keyword',
                                    },
                                },
                            },
                        },
                    },
                    mondo: {
                        type: 'nested',
                        properties: {
                            name: {
                                type: 'keyword',
                            },
                        },
                    },

                    non_observed_phenotype: {
                        type: 'nested',
                        properties: {
                            name: {
                                type: 'keyword',
                            },
                        },
                    },
                    observed_phenotype: {
                        type: 'nested',
                        properties: {
                            name: {
                                type: 'keyword',
                            },
                        },
                    },
                    outcomes: {
                        type: 'nested',
                        properties: {
                            fhir_id: {
                                type: 'keyword',
                            },
                        },
                    },
                    phenotype: {
                        type: 'nested',
                        properties: {
                            hpo_phenotype_not_observed: {
                                type: 'keyword',
                            },
                        },
                    },
                    study: {
                        properties: {
                            contacts: {
                                type: 'nested',
                                properties: {
                                    name: {
                                        type: 'keyword',
                                    },
                                },
                            },
                            data_types: {
                                type: 'nested',
                                properties: {
                                    data_type: {
                                        type: 'keyword',
                                    },
                                },
                            },
                            datasets: {
                                type: 'nested',
                                properties: {
                                    dataset_name: {
                                        type: 'keyword',
                                    },
                                },
                            },

                            study_code: {
                                type: 'keyword',
                            },
                            study_id: {
                                type: 'keyword',
                            },
                        },
                    },
                },
            },
        },
    },
};

describe('Upset', () => {
    describe(`${countIt.name} utils`, () => {
        it('should count all elements of a list and sort them in descending order', async () => {
            const data = ['a', 'b', 'b', 'a', 'c', 'a'];
            const values = countIt(data);
            expect(values).toEqual(
                new Map([
                    ['a', 3],
                    ['b', 2],
                    ['c', 1],
                ]),
            );
        });
    });

    describe(`${topN.name} utils`, () => {
        it('should keep the first n keys of map that has counts as values', async () => {
            const data = new Map([
                ['a', 4],
                ['b', 3],
                ['c', 6],
                ['d', 1],
                ['e', 10],
            ]);
            const values = topN(data, 3);
            expect(values).toEqual(['a', 'b', 'c']);
        });
    });

    describe(`${buildSteps.name} utils`, () => {
        it('should create from-size params for ES search ', async () => {
            const max = 11;
            const batchSize = 2;
            const values = buildSteps(max, batchSize);
            expect(values).toEqual([
                { from: 0, size: 2 },
                { from: 2, size: 2 },
                { from: 4, size: 2 },
                { from: 6, size: 2 },
                { from: 8, size: 2 },
                { from: 10, size: 2 },
            ]);
            expect(values.length * batchSize).toBeGreaterThanOrEqual(max);
        });
    });

    describe(`${computeUpset.name}`, () => {
        beforeEach(() => {
            (EsInstance.getInstance as jest.Mock).mockReset();
        });

        it('should compute top observed phenotypes with participants having them', async () => {
            (EsInstance.getInstance as jest.Mock).mockImplementation(() => ({
                search: async () => ({
                    body: {
                        took: 1699,
                        timed_out: false,
                        _shards: { total: 65, successful: 65, skipped: 0, failed: 0 },
                        hits: {
                            total: { value: 2, relation: 'eq' },
                            max_score: null,
                            hits: [
                                {
                                    _index: 'participant_centric_test',
                                    _type: '_doc',
                                    _id: 'nQ1F4JMB0zu1NPYlkl2T',
                                    _score: null,
                                    _source: {
                                        phenotype: [
                                            { hpo_phenotype_observed: 'Abnormality of the eye (HP:0000478)' },
                                            { hpo_phenotype_observed: 'Seizure (HP:0001250)' },
                                        ],
                                        fhir_id: 'pt-223twf8ytr',
                                    },
                                    sort: ['pt-223twf8ytr'],
                                },
                                {
                                    _index: 'participant_centric_test',
                                    _type: '_doc',
                                    _id: 'GglF4JMBRqsooo59goT2',
                                    _score: null,
                                    _source: {
                                        phenotype: [
                                            {
                                                hpo_phenotype_observed: 'Ventricular septal defect (HP:0001629)',
                                            },
                                            {
                                                hpo_phenotype_observed: 'Abnormality of the dentition (HP:0000164)',
                                            },
                                            { hpo_phenotype_observed: 'Abnormality of the eye (HP:0000478)' },
                                        ],
                                        fhir_id: 'pt-2282xh6dem',
                                    },
                                    sort: ['pt-2282xh6dem'],
                                },
                            ],
                        },
                    },
                    statusCode: 200,
                }),
                indices: {
                    getMapping: async () => MOCK_ES_PARTICIPANT_MAPPINGS,
                },
            }));

            const sqon = {
                content: [
                    {
                        content: {
                            field: 'diagnosis.source_text',
                            index: 'participant',
                            value: ['Intellectual disability'],
                        },
                        op: 'in',
                    },
                ],
                op: 'and',
            };
            const result = await computeUpset(sqon);
            expect(result).toEqual({
                data: [
                    { name: 'Abnormality of the eye (HP:0000478)', elems: ['pt-223twf8ytr', 'pt-2282xh6dem'] },
                    { name: 'Seizure (HP:0001250)', elems: ['pt-223twf8ytr'] },
                    { name: 'Ventricular septal defect (HP:0001629)', elems: ['pt-2282xh6dem'] },
                    { name: 'Abnormality of the dentition (HP:0000164)', elems: ['pt-2282xh6dem'] },
                ],
                participantsCount: 2,
            });
        });
    });
});
