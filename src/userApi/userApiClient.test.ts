import { vi } from 'vitest';
import type { CreateUpdateBody } from '../endpoints/sets/setsTypes.js';
import {
    deleteUserSet,
    getSharedSet,
    getUserSets,
    postUserSet,
    putUserSet,
    type UserSet,
    type UserSetContent,
} from './userApiClient.js';
import { UserApiError } from './userApiError.js';

// Replace global fetch with a vi.fn() for the whole suite. Node 22+ ships
// fetch as a global — it's not an import — so we swap globalThis.fetch and
// restore at the end.
const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

beforeAll(() => {
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});
afterAll(() => {
    globalThis.fetch = originalFetch;
});

// Real fetch() Response derives `ok` from the status code (true for 200-299).
// Replicate that here so the production check `response.ok` behaves the
// same against the mocks as it would against a real Response.
const buildMockResponse = (status: number, body: unknown) => ({
    status,
    ok: status >= 200 && status < 300,
    json: () => body,
});

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
            fetchMock.mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = buildMockResponse(200, [userSet, userSet]);
            fetchMock.mockImplementation(() => mockResponse);

            const result = await getUserSets(accessToken);

            expect(result).toEqual([userSet, userSet]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = buildMockResponse(401, 'Unauthorized');

            fetchMock.mockImplementation(() => mockResponse);

            await expect(getUserSets(accessToken)).rejects.toEqual(expectedError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('Get shared set by ID', () => {
        beforeEach(() => {
            fetchMock.mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = buildMockResponse(200, [{ ...userSet, sharedpublicly: true }]);
            fetchMock.mockImplementation(() => mockResponse);

            const result = await getSharedSet(accessToken, setId);

            expect(result).toEqual([{ ...userSet, sharedpublicly: true }]);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = buildMockResponse(401, 'Unauthorized');

            fetchMock.mockImplementation(() => mockResponse);

            await expect(getSharedSet(accessToken, setId)).rejects.toEqual(expectedError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
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
            fetchMock.mockReset();
        });

        it('should return body if status is < 300', async () => {
            const mockResponse = buildMockResponse(200, createdSet);
            fetchMock.mockImplementation(() => mockResponse);

            const result = await postUserSet(accessToken, createBody);

            expect(result).toEqual(createdSet);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = buildMockResponse(401, 'Unauthorized');

            fetchMock.mockImplementation(() => mockResponse);

            await expect(postUserSet(accessToken, createBody)).rejects.toEqual(expectedError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
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
            fetchMock.mockReset();
        });

        it('should return body if status is < 300', async () => {
            const mockResponse = buildMockResponse(200, updatedSet);
            fetchMock.mockImplementation(() => mockResponse);

            const result = await putUserSet(accessToken, updateBody, setId);

            expect(result).toEqual(updatedSet);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = buildMockResponse(401, 'Unauthorized');

            fetchMock.mockImplementation(() => mockResponse);

            await expect(putUserSet(accessToken, updateBody, setId)).rejects.toEqual(expectedError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('Delete user set', () => {
        beforeEach(() => {
            fetchMock.mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = buildMockResponse(200, true);
            fetchMock.mockImplementation(() => mockResponse);

            const result = await deleteUserSet(accessToken, setId);

            expect(result).toEqual(setId);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedError = new UserApiError(401, 'Unauthorized');
            const mockResponse = buildMockResponse(401, 'Unauthorized');

            fetchMock.mockImplementation(() => mockResponse);

            await expect(deleteUserSet(accessToken, setId)).rejects.toEqual(expectedError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });
});
