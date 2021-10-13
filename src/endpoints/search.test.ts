import { resolveSetsInSqon } from '../sqon/resolveSetInSqon';
import { ArrangerProject } from '../sqon/searchSqon';
import { search, SearchVariables } from './search';

jest.mock('../sqon/resolveSetInSqon');

describe('Search feature', () => {
    const projectId = '2021_05_03_v2';
    const userId = 'userId';
    const accessToken = 'access_token';
    const variables: SearchVariables = {
        sqon: {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:abc'],
                    },
                },
            ],
        },
    };
    const query = 'query($sqon: JSON) {participant {hits(filters: $sqon) {total}}}';

    beforeEach(() => {
        (resolveSetsInSqon as jest.Mock).mockReset();
    });

    it('should replace setId by participants list and send query to Arranger', async () => {
        const expectedSqon = {
            ...variables.sqon,
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
            ],
        };

        const expectedSearchResult = {
            data: {
                participant: {
                    hits: {
                        total: 198,
                    },
                },
            },
        };

        (resolveSetsInSqon as jest.Mock).mockImplementation(() => expectedSqon);

        const project: ArrangerProject = {
            runQuery: () => Promise.resolve(expectedSearchResult),
        };

        const result = await search(userId, accessToken, projectId, query, variables, () => project);

        expect(result).toEqual(expectedSearchResult);
        expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('should throw an error if replacing setId failed', async () => {
        const expectedSearchResult = {
            data: {
                participant: {
                    hits: {
                        total: 198,
                    },
                },
            },
        };

        (resolveSetsInSqon as jest.Mock).mockImplementation(() => {
            throw new Error('OOPS');
        });

        const project: ArrangerProject = {
            runQuery: () => Promise.resolve(expectedSearchResult),
        };

        try {
            await search(userId, accessToken, projectId, query, variables, () => project);
        } catch (e) {
            expect(e.message).toEqual('OOPS');
        } finally {
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
        }
    });

    it('should throw an error if project does not exist', async () => {
        const expectedSqon = {
            ...variables.sqon,
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
            ],
        };

        (resolveSetsInSqon as jest.Mock).mockImplementation(() => expectedSqon);

        const project: ArrangerProject = {
            runQuery: () => Promise.resolve(undefined),
        };

        try {
            await search(userId, accessToken, projectId, query, variables, () => project);
        } catch (e) {
            expect(e.message).toEqual(`ProjectID '${projectId}' cannot be established.`);
        } finally {
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
        }
    });
});
