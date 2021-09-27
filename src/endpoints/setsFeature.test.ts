import { createSet, Sort, updateSet, Set, getSets } from './setsFeature';
import { deleteRiff, getRiffs, postRiff, putRiff, Riff } from '../riff/riffClient';
import { searchSqon } from '../elasticSearch/searchSqon';

jest.mock('../elasticSearch/searchSqon');
jest.mock('../riff/riffClient');

describe('Set management', () => {
    const sqon = JSON.parse('{}');
    const tag = 'tag';
    const path = 'kf_id';
    const projectId = '2021_05_03_v2';
    const type = 'participant';
    const sort: Sort[] = [];
    const accessToken = 'Bearer bearer';
    const setId = '1ea';
    const userId = 'user_id';

    const mockParticipantIds = ['participant_1', 'participant_2'];

    const riff = {
        id: setId,
        alias: tag,
        content: {
            participantIds: mockParticipantIds,
            sqon,
            type: 'set',
        },
        sharedPublicly: false,
        uid: 'abcedfghijkl',
        creationDate: new Date(),
        updatedDate: new Date(),
    } as Riff;

    const updatedRiff = {
        ...riff,
        tag: 'tag updated',
        updatedDate: new Date(),
    };

    describe('Get user sets using Riff API', () => {
        beforeEach(() => {
            (getRiffs as jest.Mock).mockReset();
        });

        it('should send get riffs and return result filtered to keep only set with tag and convert to Set', async () => {
            const mockUserRiffs = [riff, { ...riff, content: {} }, { ...riff, alias: '' }];
            const expectedSets = [{ id: riff.id, tag: riff.alias, size: riff.content.participantIds.length } as Set];
            (getRiffs as jest.Mock).mockImplementation(() => mockUserRiffs);

            const result = await getSets(accessToken, userId);

            expect(result).toEqual(expectedSets);
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send get riffs and return error if get request throws an error', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await getSets(accessToken, userId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Create set using Riff API', () => {
        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (postRiff as jest.Mock).mockReset();
        });

        it('should send create riff and return result', async () => {
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postRiff as jest.Mock).mockImplementation(() => riff);

            const result = await createSet(sqon, sort, projectId, type, path, tag, accessToken);

            expect(result).toEqual(riff);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postRiff as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send create riff and return error if creation request throws an error', async () => {
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await createSet(sqon, sort, projectId, type, path, tag, accessToken);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((postRiff as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Update set using Riff API', () => {
        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (putRiff as jest.Mock).mockReset();
        });

        it('should send put riff and return result', async () => {
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);

            const result = await updateSet(sqon, sort, projectId, type, path, 'tag updated', accessToken, setId);

            expect(result).toEqual(updatedRiff);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send put riff and return error if update throws an error', async () => {
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSet(sqon, sort, projectId, type, path, 'tag updated', accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Delete set using Riff API', () => {
        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (deleteRiff as jest.Mock).mockReset();
        });

        it('should send delete riff and return result', async () => {
            (deleteRiff as jest.Mock).mockImplementation(() => true);

            const result = await deleteRiff(accessToken, setId);

            expect(result).toEqual(true);
            expect((deleteRiff as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send delete riff and return error if delete throws an error', async () => {
            (deleteRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await deleteRiff(accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((deleteRiff as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
