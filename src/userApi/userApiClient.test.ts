import fetch from 'node-fetch';

import { getUserContents } from './userApiClient';
import { UserApiError } from './userApiError';

jest.mock('node-fetch');

describe('UserApi Client', () => {
    const accessToken = 'Bearer bearer';
    const setId = '1ea';

    const output = {
        id: setId,
        uid: 'abcedfghijkl',
        content: {},
        alias: 'tag',
        sharedPublicly: false,
        creationDate: new Date(),
        updatedDate: new Date(),
    };

    describe('Get user Sets', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => [output, output] };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await getUserContents(accessToken);

            expect(result).toEqual([output, output]);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedUnauthorized = {
                timestamp: '2021-09-24T15:12:06.959+00:00',
                status: 401,
                error: 'Unauthorized',
                message: '',
                path: '/riff/user_id',
            };

            const expectedError = new UserApiError(400, expectedUnauthorized);
            const mockResponse = { status: 400, json: () => expectedUnauthorized };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await getUserContents(accessToken);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
