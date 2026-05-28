import { vi } from 'vitest';
import { RIFF_TYPE_SET } from '../endpoints/sets/setsTypes.js';
import { getSharedSet, getUserSets, type UserSet } from '../userApi/userApiClient.js';
import { resolveSetsInSqon, retrieveSetsFromUsers } from './resolveSetInSqon.js';

vi.mock('../userApi/userApiClient.js');

describe('retrieveSetsFromUsers', () => {
    beforeEach(() => {
        vi.mocked(getUserSets).mockReset();
        vi.mocked(getSharedSet).mockReset();
    });

    const setIds = ['setId1', 'setId2'];
    const setId1: UserSet = {
        id: 'setId1',
        alias: 'my first set',
        content: {
            ids: ['participant_1', 'participant_2'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: RIFF_TYPE_SET,
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const setId2: UserSet = {
        id: 'setId2',
        alias: 'my second set',
        content: {
            ids: ['participant_3', 'participant_4'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: RIFF_TYPE_SET,
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const sharedSet: UserSet = {
        id: 'sharedSet',
        alias: 'not my set',
        content: {
            ids: ['participant_5', 'participant_6'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            riffType: RIFF_TYPE_SET,
            setType: 'participant',
        },
        sharedpublicly: true,
        keycloak_id: 'uid-2ab',
        creation_date: new Date(),
        updated_date: new Date(),
    };

    it('should include user sets', async () => {
        vi.mocked(getUserSets).mockResolvedValue([setId1, setId2]);

        const result = await retrieveSetsFromUsers('access_token', setIds);

        expect(result.length).toEqual(2);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2]));
        expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(getSharedSet)).toHaveBeenCalledTimes(0);
    });

    it('should add all shared sets', async () => {
        vi.mocked(getUserSets).mockResolvedValue([setId1, setId2]);
        vi.mocked(getSharedSet).mockResolvedValue(sharedSet);

        const result = await retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet']);

        expect(result.length).toEqual(3);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2, sharedSet]));

        expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(getSharedSet)).toHaveBeenCalledTimes(1);
    });

    it('should fail if the shared set is not public (ie not returned by users-api)', async () => {
        vi.mocked(getUserSets).mockResolvedValue([setId1, setId2]);
        vi.mocked(getSharedSet).mockImplementation(() => {
            throw new Error('User Set #sharedSet does not exist.');
        });

        await expect(retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet'])).rejects.toThrow(
            'User Set #sharedSet does not exist.',
        );
        expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(getSharedSet)).toHaveBeenCalledTimes(1);
    });
});

describe('resolveSetsInSqon', () => {
    beforeEach(() => {
        vi.mocked(getUserSets).mockReset();
        vi.mocked(getSharedSet).mockReset();
    });

    it('preserves literal values alongside resolved set_id references (regression for value-array fallback)', async () => {
        const userSet: UserSet = {
            id: 'abc',
            keycloak_id: 'user',
            content: {
                ids: ['id1', 'id2'],
                sqon: { op: 'and', content: [] },
                idField: 'fhir_id',
                sort: [],
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            alias: 'my set',
            sharedpublicly: false,
            creation_date: new Date(),
            updated_date: new Date(),
        };
        vi.mocked(getUserSets).mockResolvedValue([userSet]);

        const inputSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: { field: 'some_field', value: ['set_id:abc', 'literal_B'] },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqon, 'user_id', 'access_token');

        // Pre-fix bug: the `|| op.content.value` fallback re-injects the
        // whole input array on each miss, producing
        //     ['id1', 'id2', 'set_id:abc', 'literal_B']
        // i.e. the literal IS preserved, but the unresolved set_id ref leaks
        // back into the result. Post-fix (`|| value`) keeps the literal as-is
        // without leaking the original set_id token.
        expect(result).toEqual({
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: { field: 'some_field', value: ['id1', 'id2', 'literal_B'] },
                },
            ],
        });
    });
});
