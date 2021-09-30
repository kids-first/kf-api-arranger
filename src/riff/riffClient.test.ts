import fetch from 'node-fetch';

import { CreateUpdateRiffBody, deleteRiff, getRiffs, postRiff, putRiff, Riff, RiffContent } from '../riff/riffClient';
import { RiffError } from './riffError';

jest.mock('node-fetch');

describe('Riff Client', () => {
    const accessToken = 'Bearer bearer';
    const userId = 'user_id';
    const setId = '1ea';

    const createUpdateRiffPayload = {
        alias: 'tag',
        content: {},
        sharedPublicly: false,
    } as CreateUpdateRiffBody;

    const riff = {
        id: setId,
        uid: 'abcedfghijkl',
        content: {} as RiffContent,
        alias: 'tag',
        sharedPublicly: false,
        creationDate: new Date(),
        updatedDate: new Date(),
    } as Riff;

    describe('Get user riffs', () => {
        beforeEach(() => {
            (fetch as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => [riff, riff] };
            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            const result = await getRiffs(accessToken, userId);

            expect(result).toEqual([riff, riff]);
            expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a RiffError if status is not 200', async () => {
            const expectedUnauthorized = {
                timestamp: '2021-09-24T15:12:06.959+00:00',
                status: 401,
                error: 'Unauthorized',
                message: '',
                path: '/riff/user_id',
            };

            const expectedError = new RiffError(400, expectedUnauthorized);
            const mockResponse = { status: 400, json: () => expectedUnauthorized };

            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await getRiffs(accessToken, userId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Post riff', () => {
        beforeEach(() => {
            (fetch as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => riff };
            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            const result = await postRiff(accessToken, createUpdateRiffPayload);

            expect(result).toEqual(riff);
            expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a RiffError if status is not 200', async () => {
            const expectedBadRequest = {
                timestamp: '2021-09-24T15:08:44.482+00:00',
                status: 400,
                error: 'Bad Request',
                message: '',
                path: '/riff/shorten',
            };

            const expectedError = new RiffError(400, expectedBadRequest);
            const mockResponse = { status: 400, json: () => expectedBadRequest };

            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await postRiff(accessToken, createUpdateRiffPayload);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Put riff', () => {
        beforeEach(() => {
            (fetch as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const updateRiff = { ...riff, alias: 'tag updated', updatedDate: new Date() };
            const mockResponse = { status: 200, json: () => updateRiff };
            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            const result = await putRiff(accessToken, { ...createUpdateRiffPayload, alias: 'tag updated' }, setId);

            expect(result).toEqual(updateRiff);
            expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a RiffError if status is not 200', async () => {
            const expectedNotFound = {
                timestamp: '2021-09-24T15:41:35.842+00:00',
                status: 404,
                error: 'Not Found',
                message: '',
                path: '/riff/1ea',
            };

            const expectedError = new RiffError(404, expectedNotFound);
            const mockResponse = { status: 404, json: () => expectedNotFound };

            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await putRiff(accessToken, { ...createUpdateRiffPayload, alias: 'tag updated' }, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Delete riff', () => {
        beforeEach(() => {
            (fetch as jest.Mock).mockReset();
        });

        it('should return body if status is 200', async () => {
            const mockResponse = { status: 200, json: () => true };
            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            const result = await deleteRiff(accessToken, setId);

            expect(result).toEqual(true);
            expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should throw a RiffError if status is not 200', async () => {
            const expectedUnauthorized = {
                timestamp: '2021-09-24T15:12:06.959+00:00',
                status: 401,
                error: 'Unauthorized',
                message: '',
                path: '/riff/1ea',
            };

            const expectedError = new RiffError(401, expectedUnauthorized);
            const mockResponse = { status: 401, json: () => expectedUnauthorized };

            (fetch as jest.Mock).mockImplementation(() => mockResponse);

            try {
                await deleteRiff(accessToken, setId);
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect((fetch as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
