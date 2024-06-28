import fetch from 'node-fetch';

import { CreateUpdateBody } from '../endpoints/sets/setsTypes';
import {
    deleteUserSet,
    getSharedSet,
    getUserSets,
    postUserSet,
    putUserSet,
    UserSet,
    UserSetContent,
} from './userApiClient';
import { UserApiError } from './userApiError';

jest.mock('node-fetch');

describe('UserApi Client', () => {
    const accessToken = 'Bearer bearer';
    const setId = '1ea';

    const userSet: UserSet = {
        id: setId,
        keycloak_id: 'user_id',
        content: {} as UserSetContent,
        alias: 'tag',
        sharedpublicly: false,
        creation_date: new Date(),
        updated_date: new Date(),
    };

    describe('Get user Sets', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => [userSet, userSet] };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await getUserSets(accessToken);

            expect(result).toEqual([userSet, userSet]);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = { status: 401, json: () => 'Unauthorized' };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await getUserSets(accessToken);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Get shared set by ID', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => [{ ...userSet, sharedpublicly: true }] };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await getSharedSet(accessToken, setId);

            expect(result).toEqual([{ ...userSet, sharedpublicly: true }]);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = { status: 401, json: () => 'Unauthorized' };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await getSharedSet(accessToken, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Post user set', () => {
        const createBody: CreateUpdateBody = {
            content: {} as UserSetContent,
            alias: 'tag1',
            sharedPublicly: false,
        };

        const createdSet: UserSet = { ...userSet, alias: 'tag1' };

        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is < 300', async () => {
            const mockResponse = { status: 200, json: () => createdSet };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await postUserSet(accessToken, createBody);

            expect(result).toEqual(createdSet);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = { status: 401, json: () => 'Unauthorized' };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await postUserSet(accessToken, createBody);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Put user set', () => {
        const updateBody: CreateUpdateBody = {
            content: {} as UserSetContent,
            alias: 'tag2',
            sharedPublicly: false,
        };

        const updatedSet: UserSet = { ...userSet, alias: 'tag2' };

        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is < 300', async () => {
            const mockResponse = { status: 200, json: () => updatedSet };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await putUserSet(accessToken, updateBody, setId);

            expect(result).toEqual(updatedSet);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = { status: 401, json: () => 'Unauthorized' };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await putUserSet(accessToken, updateBody, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Delete user set', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => true };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await deleteUserSet(accessToken, setId);

            expect(result).toEqual(setId);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = { status: 401, json: () => 'Unauthorized' };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await deleteUserSet(accessToken, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
