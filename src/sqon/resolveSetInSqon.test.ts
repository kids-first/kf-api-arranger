/* eslint-disable @typescript-eslint/no-var-requires */

import { getSharedSet, getUserContents, Output as UserSetOutput } from '../userApi/userApiClient';
import { retrieveSetsFromUsers } from './resolveSetInSqon';

jest.mock('../userApi/userApiClient');

describe('retrieveSetsFromUsers', () => {
    beforeEach(() => {
        (getUserContents as jest.Mock).mockReset();
        (getSharedSet as jest.Mock).mockReset();
    });

    const setIds = ['setId1', 'setId2'];
    const setId1: UserSetOutput = {
        id: 'setId1',
        alias: 'my first set',
        content: {
            ids: ['participant_1', 'participant_2'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const setId2: UserSetOutput = {
        id: 'setId2',
        alias: 'my second set',
        content: {
            ids: ['participant_3', 'participant_4'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            setType: 'participant',
        },
        sharedpublicly: false,
        keycloak_id: 'uid-1ez',
        creation_date: new Date(),
        updated_date: new Date(),
    };
    const sharedSet: UserSetOutput = {
        id: 'sharedSet',
        alias: 'not my set',
        content: {
            ids: ['participant_5', 'participant_6'],
            sqon: { op: 'and', content: [] },
            idField: 'fhir_id',
            sort: [],
            setType: 'participant',
        },
        sharedpublicly: true,
        keycloak_id: 'uid-2ab',
        creation_date: new Date(),
        updated_date: new Date(),
    };

    it('should include user sets', async () => {
        (getUserContents as jest.Mock).mockImplementation(() => [setId1, setId2]);

        const result = await retrieveSetsFromUsers('access_token', setIds);

        expect(result.length).toEqual(2);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2]));
        expect((getUserContents as jest.Mock).mock.calls.length).toEqual(1);
        expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(0);
    });

    it('should add all shared sets', async () => {
        (getUserContents as jest.Mock).mockImplementation(() => [setId1, setId2]);
        (getSharedSet as jest.Mock).mockImplementation(() => sharedSet);

        const result = await retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet']);

        expect(result.length).toEqual(3);
        expect(result).toEqual(expect.arrayContaining([setId1, setId2, sharedSet]));

        expect((getUserContents as jest.Mock).mock.calls.length).toEqual(1);
        expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('should fail if the shared set is not public (ie not returned by users-api)', async () => {
        (getUserContents as jest.Mock).mockImplementation(() => [setId1, setId2]);
        (getSharedSet as jest.Mock).mockImplementation(() => {
            throw new Error('User Set #sharedSet does not exist.');
        });

        try {
            await retrieveSetsFromUsers('access_token', [...setIds, 'sharedSet']);
        } catch (e) {
            expect(e.message).toEqual('User Set #sharedSet does not exist.');
        } finally {
            expect((getUserContents as jest.Mock).mock.calls.length).toEqual(1);
            expect((getSharedSet as jest.Mock).mock.calls.length).toEqual(1);
        }
    });
});
