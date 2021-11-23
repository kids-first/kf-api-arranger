import { SetSqon } from '../endpoints/sets/setsTypes';
import { getRiffs, Riff, RIFF_TYPE_SET } from '../riff/riffClient';
import { resolveSetsInSqon } from './resolveSetInSqon';

jest.mock('../riff/riffClient');

describe('resolveSetsInSqon', () => {
    beforeEach(() => {
        (getRiffs as jest.Mock).mockReset();
    });

    it('should return the input sqon if not set id in it', async () => {
        const inputSqonWithoutSetId: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'gender',
                        value: ['Female'],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithoutSetId, 'userId', 'access_token');

        expect(result).toEqual(inputSqonWithoutSetId);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(0);
    });

    it('should replace set id by its content', async () => {
        const inputSqonWithSetIds: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ez'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ey'],
                    },
                },
            ],
        };

        const riff1ez = {
            id: '1ez',
            alias: 'tag-1ez',
            content: {
                ids: ['participant_1', 'participant_2'],
                sqon: {},
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            sharedPublicly: false,
            uid: 'uid-1ez',
            creationDate: new Date(),
            updatedDate: new Date(),
        } as Riff;

        const riff1ey = {
            id: '1ey',
            alias: 'tag-1ey',
            content: {
                ids: ['participant_1', 'participant_3'],
                sqon: {},
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            sharedPublicly: false,
            uid: 'uid-1ey',
            creationDate: new Date(),
            updatedDate: new Date(),
        } as Riff;

        const anotherRiff = {
            id: '1ea',
            alias: 'tag-1ea',
            content: {
                ids: ['participant_2', 'participant_3'],
                sqon: {},
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            sharedPublicly: false,
            uid: 'uid-1ea',
            creationDate: new Date(),
            updatedDate: new Date(),
        } as Riff;

        const getRiffsMockResponse = [riff1ey, anotherRiff, riff1ez];

        (getRiffs as jest.Mock).mockImplementation(() => getRiffsMockResponse);

        const expectedResult: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_3'],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithSetIds, 'userId', 'access_token');

        expect(result).toEqual(expectedResult);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
    });

    it('should replace set id by an empty array if it has not any set content matching to it', async () => {
        const inputSqonWithSetIds: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ez'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['set_id:1ex'],
                    },
                },
            ],
        };

        const riff1ez = {
            id: '1ez',
            alias: 'tag-1ez',
            content: {
                ids: ['participant_1', 'participant_2'],
                sqon: {},
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            sharedPublicly: false,
            uid: 'uid-1ez',
            creationDate: new Date(),
            updatedDate: new Date(),
        } as Riff;

        const anotherRiff = {
            id: '1ea',
            alias: 'tag-1ea',
            content: {
                ids: ['participant_2', 'participant_3'],
                sqon: {},
                riffType: RIFF_TYPE_SET,
                setType: 'participant',
            },
            sharedPublicly: false,
            uid: 'uid-1ea',
            creationDate: new Date(),
            updatedDate: new Date(),
        } as Riff;

        const getRiffsMockResponse = [anotherRiff, riff1ez];

        (getRiffs as jest.Mock).mockImplementation(() => getRiffsMockResponse);

        const expectedResult: SetSqon = {
            op: 'and',
            content: [
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: ['participant_1', 'participant_2'],
                    },
                },
                {
                    op: 'in',
                    content: {
                        field: 'kf_id',
                        value: [],
                    },
                },
            ],
        };

        const result = await resolveSetsInSqon(inputSqonWithSetIds, 'userId', 'access_token');

        expect(result).toEqual(expectedResult);
        expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
    });
});
