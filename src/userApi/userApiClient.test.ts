import fetch from 'node-fetch';

import { CreateUpdateBody, deleteRiff, getRiffs, postRiff, putRiff, Output, Content } from '../riff/riffClient';
import { UserApiError } from './userApiError';
import {getUserContents} from "./userApiClient";

jest.mock('node-fetch');

describe('UserApi Client', () => {
    const accessToken = 'Bearer bearer';
    const userId = 'user_id';
    const setId = '1ea';

    const createUpdatePayload = {
        alias: 'tag',
        content: {},
        sharedPublicly: false,
    } as CreateUpdateBody;

    const output = {
        id: setId,
        uid: 'abcedfghijkl',
        content: {} as Content,
        alias: 'tag',
        sharedPublicly: false,
        creationDate: new Date(),
        updatedDate: new Date(),
    } as Output;

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

    describe('Post userContents', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => output };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await postRiff(accessToken, createUpdatePayload);

            expect(result).toEqual(output);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedBadRequest = {
                timestamp: '2021-09-24T15:08:44.482+00:00',
                status: 400,
                error: 'Bad Request',
                message: '',
                path: '/riff/shorten',
            };

            const expectedError = new UserApiError(400, expectedBadRequest);
            const mockResponse = { status: 400, json: () => expectedBadRequest };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await postRiff(accessToken, createUpdatePayload);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Put User Content', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const updateRiff = { ...output, alias: 'tag updated', updatedDate: new Date() };
            const mockResponse = { status: 200, json: () => updateRiff };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await putRiff(accessToken, { ...createUpdatePayload, alias: 'tag updated' }, setId);

            expect(result).toEqual(updateRiff);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a UserApiError if status is not 200', async () => {
            const expectedNotFound = {
                timestamp: '2021-09-24T15:41:35.842+00:00',
                status: 404,
                error: 'Not Found',
                message: '',
                path: '/riff/1ea',
            };

            const expectedError = new UserApiError(404, expectedNotFound);
            const mockResponse = { status: 404, json: () => expectedNotFound };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await putRiff(accessToken, { ...createUpdatePayload, alias: 'tag updated' }, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Delete User Content', () => {
        beforeEach(() => {
            ((fetch as unknown) as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => true };
            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            const result = await deleteRiff(accessToken, setId);

            expect(result).toEqual(true);
            expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a RiffError if status is not 200', async () => {
            const expectedUnauthorized = {
                timestamp: '2021-09-24T15:12:06.959+00:00',
                status: 401,
                error: 'Unauthorized',
                message: '',
                path: '/riff/1ea',
            };

            const expectedError = new UserApiError(401, expectedUnauthorized);
            const mockResponse = { status: 401, json: () => expectedUnauthorized };

            ((fetch as unknown) as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await deleteRiff(accessToken, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect(((fetch as unknown) as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
