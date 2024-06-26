import { computeAuthorizedStudiesForFence } from './computeAuthorizedStudies';
import { multiSearchFilesAccessCounts, searchAggregatedAuthorizedStudiesForFence } from './searchers';
import { AuthStudiesData } from './types';

jest.mock('./searchers');
jest.mock('../../ElasticSearchClientInstance', () => jest.fn());

describe('Compute Authorized Studies', () => {
    describe(`${computeAuthorizedStudiesForFence.name} `, () => {
        beforeEach(() => {
            (searchAggregatedAuthorizedStudiesForFence as jest.Mock).mockReset();
            (multiSearchFilesAccessCounts as jest.Mock).mockReset();
        });

        it(`should give proper result when data exists in elasticsearch cluster`, async () => {
            (searchAggregatedAuthorizedStudiesForFence as jest.Mock).mockImplementation(() =>
                Promise.resolve([
                    {
                        key: 'SD_PREASA7S',
                        doc_count: 100,
                        top_study_hits: {
                            hits: {
                                total: { value: 100, relation: 'eq' },
                                hits: [
                                    {
                                        _source: {
                                            study: {
                                                study_name: 'National Heart, Lung, and Blood Institute...',
                                                study_code: 'KF-CHD',
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        acls: {
                            buckets: [
                                { key: 'SD_PREASA7S', doc_count: 100 },
                                { key: 'phs001138.c999', doc_count: 100 },
                                { key: 'phs001138.c1', doc_count: 78 },
                            ],
                        },
                    },
                    {
                        key: 'SD_Z6MWD3H0',
                        doc_count: 4,
                        top_study_hits: {
                            hits: {
                                total: { value: 4, relation: 'eq' },
                                hits: [
                                    {
                                        _source: {
                                            study: {
                                                study_name: 'Kids First: Genomic Analysis of Congenital...',
                                                study_code: 'KF-CHDALL',
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                        acls: {
                            buckets: [
                                { key: 'SD_Z6MWD3H0', doc_count: 4 },
                                { key: 'phs002330.c2', doc_count: 4 },
                                { key: 'phs002330.c999', doc_count: 4 },
                                { key: 'open_access', doc_count: 10 },
                            ],
                        },
                    },
                ]),
            );

            (multiSearchFilesAccessCounts as jest.Mock).mockImplementation(() =>
                Promise.resolve([
                    {
                        hits: { total: { value: 100, relation: 'eq' }, max_score: null, hits: [] },
                        status: 200,
                    },
                    {
                        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
                        status: 200,
                    },
                    {
                        hits: { total: { value: 100, relation: 'eq' }, max_score: null, hits: [] },
                        status: 200,
                    },
                    {
                        hits: { total: { value: 10, relation: 'eq' }, max_score: null, hits: [] },
                        status: 200,
                    },
                ]),
            );

            const r: { data: AuthStudiesData } = await computeAuthorizedStudiesForFence(null, 'gen3', [
                'phs001138.c1',
                'phs001138.c999',
                'phs002330.c2',
            ]);

            expect((searchAggregatedAuthorizedStudiesForFence as jest.Mock).mock.calls.length).toEqual(1);
            expect((multiSearchFilesAccessCounts as jest.Mock).mock.calls.length).toEqual(1);
            expect(r).toHaveProperty(['data']);
            expect(r.data).toEqual([
                {
                    study_id: 'SD_PREASA7S',
                    user_acl_in_study: ['phs001138.c999', 'phs001138.c1'],
                    study_code: 'KF-CHD',
                    title: 'National Heart, Lung, and Blood Institute...',
                    authorized_controlled_files_count: 100,
                    total_files_count: 100,
                    total_authorized_files_count: 100,
                },
                {
                    study_id: 'SD_Z6MWD3H0',
                    user_acl_in_study: ['phs002330.c2', 'open_access'],
                    study_code: 'KF-CHDALL',
                    title: 'Kids First: Genomic Analysis of Congenital...',
                    authorized_controlled_files_count: 4,
                    total_files_count: 100,
                    total_authorized_files_count: 14,
                },
            ]);
        });
    });
});
