import { createSet, updateSetTag, updateSetContent, getSets, SubActionTypes, deleteSet } from './setsFeature';
import { Sort, Set, CreateSetBody, UpdateSetTagBody, UpdateSetContentBody } from './setsTypes';
import {
    CreateUpdateRiffBody,
    deleteRiff,
    getRiffs,
    postRiff,
    putRiff,
    Riff,
    RIFF_TYPE_SET,
} from '../../riff/riffClient';
import { searchSqon } from '../../elasticSearch/searchSqon';
import { sendSetInSQSQueue } from '../../SQS/sendEvent';
import AWS from 'aws-sdk';

jest.mock('../../elasticSearch/searchSqon');
jest.mock('../../riff/riffClient');
jest.mock('../../SQS/sendEvent');

describe('Set management', () => {
    const sqon = { op: 'and', content: [] };
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
            ids: mockParticipantIds,
            sqon,
            riffType: RIFF_TYPE_SET,
            setType: type,
        },
        sharedPublicly: false,
        uid: 'abcedfghijkl',
        creationDate: new Date(),
        updatedDate: new Date(),
    } as Riff;

    describe('Get user sets using Riff API', () => {
        beforeEach(() => {
            (getRiffs as jest.Mock).mockReset();
        });

        it('should send get riffs and return result filtered to keep only set with tag and convert to Set', async () => {
            const mockUserRiffs = [riff, { ...riff, content: {} }, { ...riff, alias: '' }];
            const expectedSets = [{ id: riff.id, tag: riff.alias, size: riff.content.ids.length } as Set];
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
        const createSetBody: CreateSetBody = {
            path,
            projectId,
            sort,
            sqon,
            tag,
            type,
        };

        const expectedCreateRiffBody: CreateUpdateRiffBody = {
            alias: tag,
            sharedPublicly: false,
            content: {
                ids: mockParticipantIds,
                path,
                sort,
                sqon,
                riffType: RIFF_TYPE_SET,
                setType: type,
            },
        };

        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (postRiff as jest.Mock).mockReset();
            (sendSetInSQSQueue as jest.Mock).mockReset();
        });

        it('should send create riff, send message in SQS and return result', async () => {
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postRiff as jest.Mock).mockImplementation(() => riff);

            const result = await createSet(createSetBody, accessToken, userId, sqs);

            expect(result).toEqual(riff);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((postRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((postRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedCreateRiffBody);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should not send message in SQS for empty tag sets', async () => {
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postRiff as jest.Mock).mockImplementation(() => ({ ...riff, alias: '' }));

            const result = await createSet({ ...createSetBody, tag: '' }, accessToken, userId, sqs);

            expect(result).toEqual({ ...riff, alias: '' });
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
        });

        it('should send create riff and return error if creation request throws an error', async () => {
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await createSet(createSetBody, accessToken, userId, sqs);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((postRiff as jest.Mock).mock.calls.length).toEqual(1);
                expect((postRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
                expect((postRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedCreateRiffBody);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });
    });

    describe('Update set tag using Riff API', () => {
        const updateSetTagBody: UpdateSetTagBody = {
            newTag: 'tag updated',
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.RENAME_TAG,
        };

        const mockExistingSets = [riff];

        const expectedUpdateRiffBody: CreateUpdateRiffBody = {
            alias: updateSetTagBody.newTag,
            sharedPublicly: riff.sharedPublicly,
            content: riff.content,
        };

        const updatedRiff: Riff = {
            ...riff,
            alias: 'tag updated',
            updatedDate: new Date(),
        };

        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

        beforeEach(() => {
            (getRiffs as jest.Mock).mockReset();
            (putRiff as jest.Mock).mockReset();
            (sendSetInSQSQueue as jest.Mock).mockReset();
        });

        it('should send put riff and return result', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));

            const result = await updateSetTag(updateSetTagBody, accessToken, userId, setId, sqs);

            expect(result).toEqual(updatedRiff);
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateRiffBody);
            expect((putRiff as jest.Mock).mock.calls[0][2]).toEqual(setId);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should not send message in SQS for empty tag sets', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (putRiff as jest.Mock).mockImplementation(() => ({ ...updatedRiff, alias: '' }));

            const result = await updateSetTag({ ...updateSetTagBody, newTag: '' }, accessToken, userId, setId, sqs);

            expect(result).toEqual({ ...updatedRiff, alias: '' });
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
        });

        it('should return an error if set to update does not exist', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => []);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);

            try {
                await updateSetTag(updateSetTagBody, accessToken, userId, setId, sqs);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
                expect((putRiff as jest.Mock).mock.calls.length).toEqual(0);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });

        it('should send put riff and return error if update throws an error', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (putRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetTag(updateSetTagBody, accessToken, userId, setId, sqs);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
                expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
                expect((putRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
                expect((putRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateRiffBody);
                expect((putRiff as jest.Mock).mock.calls[0][2]).toEqual(setId);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });
    });

    describe('Update set content using Riff API', () => {
        const newSqon = { op: 'and', content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }] };
        const mockNewSqonParticipantIds = ['participant_1', 'participant_3'];

        const mockExistingSets = [riff];

        const updateSetContentAddSqon: UpdateSetContentBody = {
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.ADD_IDS,
            projectId,
            sqon: newSqon,
        };

        const updateSetContentRemoveSqon = { ...updateSetContentAddSqon, subAction: SubActionTypes.REMOVE_IDS };

        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

        beforeEach(() => {
            (getRiffs as jest.Mock).mockReset();
            (putRiff as jest.Mock).mockReset();
            (searchSqon as jest.Mock).mockReset();
            (sendSetInSQSQueue as jest.Mock).mockReset();
        });

        it('should send put riff and return result - case add ids', async () => {
            const expectedAddSqon = { op: 'or', content: [sqon, newSqon] };
            const expectedUpdateRiffBody: CreateUpdateRiffBody = {
                alias: riff.alias,
                sharedPublicly: riff.sharedPublicly,
                content: {
                    ...riff.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
            };
            const updatedRiff = {
                ...riff,
                content: {
                    ...riff.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
                updatedDate: new Date(),
            };

            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));

            const result = await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, sqs);

            expect(result).toEqual(updatedRiff);
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateRiffBody);
            expect((putRiff as jest.Mock).mock.calls[0][2]).toEqual(setId);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should not send message in SQS for empty tag sets', async () => {
            const expectedAddSqon = { op: 'or', content: [sqon, newSqon] };
            const updatedRiff: Riff = {
                ...riff,
                alias: '',
                content: {
                    ...riff.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
                updatedDate: new Date(),
            };

            (getRiffs as jest.Mock).mockImplementation(() => [{ ...riff, tag: '' }]);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);

            const result = await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, sqs);

            expect(result).toEqual(updatedRiff);
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
        });

        it('should send put riff and return result - case remove ids', async () => {
            const expectedRemoveSqon = {
                op: 'and',
                content: [sqon, { op: 'not', content: [newSqon] }],
            };
            const expectedUpdateRiffBody: CreateUpdateRiffBody = {
                alias: riff.alias,
                sharedPublicly: riff.sharedPublicly,
                content: {
                    ...riff.content,
                    sqon: expectedRemoveSqon,
                    ids: ['participant_2'],
                },
            };
            const updatedRiff = {
                ...riff,
                content: {
                    ...riff.content,
                    sqon: expectedRemoveSqon,
                    ids: ['participant_2'],
                },
                updatedDate: new Date(),
            };

            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => updatedRiff);
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));

            const result = await updateSetContent(updateSetContentRemoveSqon, accessToken, userId, setId, sqs);

            expect(result).toEqual(updatedRiff);
            expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((putRiff as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putRiff as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateRiffBody);
            expect((putRiff as jest.Mock).mock.calls[0][2]).toEqual(setId);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should return an error if set to update does not exist', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => []);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, sqs);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(0);
                expect((putRiff as jest.Mock).mock.calls.length).toEqual(0);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });

        it('should send put riff and return error if update throws an error', async () => {
            (getRiffs as jest.Mock).mockImplementation(() => mockExistingSets);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, sqs);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getRiffs as jest.Mock).mock.calls.length).toEqual(1);
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((putRiff as jest.Mock).mock.calls.length).toEqual(1);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });
    });

    describe('Delete set using Riff API', () => {
        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (deleteRiff as jest.Mock).mockReset();
            (sendSetInSQSQueue as jest.Mock).mockReset();
        });

        it('should send delete riff and return result', async () => {
            (deleteRiff as jest.Mock).mockImplementation(() => true);
            (sendSetInSQSQueue as jest.Mock).mockImplementation(() => Promise.resolve({ MessageId: '123' }));

            const result = await deleteSet(accessToken, setId, userId, sqs);

            expect(result).toEqual(true);
            expect((deleteRiff as jest.Mock).mock.calls.length).toEqual(1);
            expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send delete riff and return error if delete throws an error', async () => {
            (deleteRiff as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await deleteSet(accessToken, setId, userId, sqs);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((deleteRiff as jest.Mock).mock.calls.length).toEqual(1);
                expect((sendSetInSQSQueue as jest.Mock).mock.calls.length).toEqual(0);
            }
        });
    });
});
