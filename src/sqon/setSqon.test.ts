import { getUserSets, postSetsTags } from '../userApi/userApiClient';
import { resolveSetIds, resolveQueriesSetAliases } from './setSqon';
import { Sqon } from './types';

jest.mock('../userApi/userApiClient');

describe(`resolveSetIds`, () => {
    beforeEach(() => {
        (getUserSets as jest.Mock).mockReset();
    });

    it('should leave the sqon intact if no set_id is detected', async () => {
        const sqon = {
            content: [
                {
                    content: [
                        {
                            content: {
                                field: 'diagnosis.age_at_event_days',
                                index: 'participant',
                                value: [5000],
                            },
                            op: '<',
                        },
                        {
                            content: {
                                field: 'diagnosis.age_at_event_days',
                                index: 'participant',
                                value: ['__missing__'],
                            },
                            op: 'in',
                        },
                    ],
                    op: 'or',
                },
                {
                    content: {
                        field: 'files.data_category',
                        index: 'file',
                        value: ['Genomics'],
                    },
                    op: 'in',
                },
            ],
            op: 'and',
        };
        const result = await resolveSetIds(sqon, 'access_token');
        expect(result).toEqual(sqon);
    });

    it('should replace set_ids with concrete ids when appropriate', async () => {
        (getUserSets as jest.Mock).mockImplementation(() => [
            {
                id: 'e1ef0cb7-a40f-4133-b14c-01fa6b4a23ef',
                content: {
                    ids: ['participantId1', 'participantId2'],
                },
            },
            {
                id: '991036b5-a4b2-47ba-be7c-882102253d06',
                content: {
                    ids: ['participantId3'],
                },
            },
        ]);

        const sqon = {
            content: [
                {
                    content: [
                        {
                            content: {
                                field: 'participant_facet_ids.participant_fhir_id_1',
                                index: 'participant',
                                value: ['set_id:e1ef0cb7-a40f-4133-b14c-01fa6b4a23ef'],
                            },
                            op: 'in',
                        },
                        {
                            content: {
                                field: 'diagnosis.age_at_event_days',
                                index: 'participant',
                                value: ['__missing__'],
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
                                field: 'participant_facet_ids.participant_fhir_id_1',
                                index: 'participant',
                                value: ['set_id:991036b5-a4b2-47ba-be7c-882102253d06'],
                            },
                            op: 'in',
                        },
                    ],
                    op: 'and',
                },
            ],
            op: 'or',
        };

        const result = await resolveSetIds(sqon, 'access_token');

        expect(result.op).toEqual(sqon.op);
        expect(result.content.length).toEqual(2);
        expect(JSON.stringify(result)).not.toContain('set_id:');
        expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
    });
});

describe(`resolveQueriesSetAliases`, () => {
    beforeEach(() => {
        (postSetsTags as jest.Mock).mockReset();
    });

    it('should return an empty if no set_id is detected', async () => {
        const queries = [
            {
                content: [
                    {
                        content: {
                            field: 'files.data_category',
                            index: 'file',
                            value: ['Genomics'],
                        },
                        op: 'in',
                    },
                ],
                op: 'and',
            },
        ];
        const result = await resolveQueriesSetAliases(queries, 'access_token');
        expect(result).toEqual([]);
    });

    it('should find the tags for the set_ids present in the queries', async () => {
        const sampleSetIdsToTags = [
            {
                setId: 'set_id:459b87ae-1910-4b52-bfcb-bb50062f40db',
                alias: 'Cypress_B',
            },
            {
                setId: 'set_id:f2ba2794-b486-4169-b91b-7e10a932f0e7',
                alias: 'Q1 union Q2 - 1165',
            },
        ];
        (postSetsTags as jest.Mock).mockImplementation(() => sampleSetIdsToTags);

        const queries: Sqon[] = [
            {
                id: '879e19f8-0998-4dab-b949-94096d4e02fe',
                op: 'and',
                content: [
                    {
                        op: 'in',
                        content: {
                            field: 'participant_facet_ids.participant_fhir_id_1',
                            index: 'participant',
                            value: ['set_id:459b87ae-1910-4b52-bfcb-bb50062f40db'],
                        },
                    },
                ],
            },
            {
                content: [
                    {
                        content: {
                            field: 'participant_facet_ids.participant_fhir_id_1',
                            index: 'participant',
                            value: ['set_id:f2ba2794-b486-4169-b91b-7e10a932f0e7'],
                        },
                        op: 'in',
                    },
                ],
                id: 'f1b6b4ea-ef51-4a80-8a30-19abebb3eadb',
                op: 'and',
            },
        ];

        const result = await resolveQueriesSetAliases(queries, 'access_token');

        expect(result.length).toEqual(2);
        expect(result.sort((a, b) => a.setId.localeCompare(b.setId))).toEqual(
            sampleSetIdsToTags.sort((a, b) => a.setId.localeCompare(b.setId)),
        );
        expect((postSetsTags as jest.Mock).mock.calls.length).toEqual(1);
    });
});
