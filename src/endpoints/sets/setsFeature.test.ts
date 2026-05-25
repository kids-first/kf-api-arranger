import { vi } from 'vitest';
import type { RunInternalQuery } from '../../arrangerUtils.js';
import { resolveSetsInSqon } from '../../sqon/resolveSetInSqon.js';
import { searchSqon } from '../../sqon/searchSqon.js';
import { deleteUserSet, getUserSets, postUserSet, putUserSet, UserSet } from '../../userApi/userApiClient.js';
import { createSet, deleteSet, getSets, SubActionTypes, updateSetContent, updateSetTag } from './setsFeature.js';
import {
    CreateSetBody,
    CreateUpdateBody,
    RIFF_TYPE_SET,
    Set,
    Sort,
    UpdateSetContentBody,
    UpdateSetTagBody,
} from './setsTypes.js';

vi.mock('../../sqon/resolveSetInSqon');
vi.mock('../../sqon/searchSqon');
vi.mock('../../userApi/userApiClient');
vi.mock('../../env', () => ({
    esHost: 'http://localhost:9200',
    maxSetContentSize: 3,
}));

describe('Set management', () => {
    const sqon = { op: 'and', content: [] };
    const tag = 'tag';
    const idField = 'kf_id';
    const type = 'participant';
    const sort: Sort[] = [];
    const accessToken = 'Bearer bearer';
    const setId = '1ea';
    const userId = 'user_id';
    const runInternalQuery: RunInternalQuery = async () => ({ data: null });

    const mockParticipantIds = ['participant_1', 'participant_2'];

    const userSet: UserSet = {
        id: setId,
        alias: tag,
        content: {
            ids: mockParticipantIds,
            sqon,
            riffType: RIFF_TYPE_SET,
            setType: type,
            idField: 'fhir_id',
            sort: [],
        },
        sharedpublicly: false,
        keycloak_id: userId,
        creation_date: new Date(),
        updated_date: new Date(),
    };

    const set: Set = {
        id: userSet.id,
        tag: userSet.alias,
        size: userSet.content.ids.length,
        setType: userSet.content.setType,
        created_date: userSet.creation_date,
        updated_date: userSet.updated_date,
        is_invisible: userSet.is_invisible,
    };

    describe('Get user sets using Users-API', () => {
        beforeEach(() => {
            vi.mocked(getUserSets).mockReset();
        });

        it('should send get user contents and convert to Set', async () => {
            const mockUserSets = [userSet];
            const expectedSets: Set[] = [set];
            vi.mocked(getUserSets).mockResolvedValue(mockUserSets);

            const result = await getSets(accessToken);

            expect(result).toEqual(expectedSets);
            expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
        });

        it('should send get user contents and return error if get request throws an error', async () => {
            vi.mocked(getUserSets).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await getSets(accessToken);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
            }
        });
    });

    describe('Create a set', () => {
        const createSetBody: CreateSetBody = {
            idField,
            sort,
            sqon,
            tag,
            type,
        };

        const expectedCreatesSetBody: CreateUpdateBody = {
            alias: tag,
            sharedPublicly: false,
            content: {
                ids: mockParticipantIds,
                idField,
                sort,
                sqon,
                riffType: RIFF_TYPE_SET,
                setType: type,
            },
            is_invisible: false,
        };

        beforeEach(() => {
            vi.mocked(resolveSetsInSqon).mockReset();
            vi.mocked(searchSqon).mockReset();
            vi.mocked(postUserSet).mockReset();
        });

        it('should send post user set and return result', async () => {
            vi.mocked(resolveSetsInSqon).mockImplementation(async sqon => sqon);
            vi.mocked(searchSqon).mockResolvedValue(mockParticipantIds);
            vi.mocked(postUserSet).mockResolvedValue(userSet);

            const result = await createSet(createSetBody, accessToken, userId, runInternalQuery);

            expect(result).toEqual(set);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(postUserSet).mock.calls[0][1]).toEqual(expectedCreatesSetBody);
        });

        it('should resolve set_id in sqon before saving new set', async () => {
            const sqonWithSetId = {
                op: 'and',
                content: [{ op: 'in', content: { field: 'kf_id', value: ['set_id:1a1'] } }],
            };

            const sqonWithResolvedSetId = {
                op: 'and',
                content: [{ op: 'in', content: { field: 'kf_id', value: mockParticipantIds } }],
            };

            vi.mocked(resolveSetsInSqon).mockResolvedValue(sqonWithResolvedSetId);
            vi.mocked(searchSqon).mockResolvedValue(mockParticipantIds);
            vi.mocked(postUserSet).mockResolvedValue(userSet);

            const result = await createSet({ ...createSetBody, sqon: sqonWithSetId }, accessToken, userId, runInternalQuery);

            expect(result).toEqual(set);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetsInSqon).mock.calls[0][0]).toEqual(sqonWithSetId);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(postUserSet).mock.calls[0][1]).toEqual({
                ...expectedCreatesSetBody,
                content: { ...expectedCreatesSetBody.content, sqon: sqonWithSetId },
            });
        });

        it('should truncate id list if greater than max defined in config', async () => {
            const mockTooLongParticipantIds = [
                'participant_1',
                'participant_2',
                'participant_3',
                'participant_4',
                'participant_5',
            ];

            const truncatedUserSet: UserSet = {
                ...userSet,
                content: { ...userSet.content, ids: ['participant_1', 'participant_2', 'participant_3'] },
                updated_date: new Date(),
            };

            const expectedSet: Set = {
                ...set,
                size: 3,
                updated_date: truncatedUserSet.updated_date,
            };
            vi.mocked(resolveSetsInSqon).mockImplementation(async sqon => sqon);
            vi.mocked(searchSqon).mockResolvedValue(mockTooLongParticipantIds);
            vi.mocked(postUserSet).mockResolvedValue(truncatedUserSet);

            const result = await createSet(createSetBody, accessToken, userId, runInternalQuery);

            expect(result).toEqual(expectedSet);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(postUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(postUserSet).mock.calls[0][1]).toEqual({
                ...expectedCreatesSetBody,
                content: {
                    ...expectedCreatesSetBody.content,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
            });
        });
    });

    describe('Update set alias', () => {
        const updateSetTagBody: UpdateSetTagBody = {
            newTag: 'tag updated',
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.RENAME_TAG,
        };

        const mockExistingSets = [userSet];

        const expectedUpdateBody: CreateUpdateBody = {
            alias: updateSetTagBody.newTag,
            sharedPublicly: userSet.sharedpublicly,
            content: userSet.content,
        };

        const updatedSet: UserSet = {
            ...userSet,
            alias: 'tag updated',
            updated_date: new Date(),
        };

        beforeEach(() => {
            vi.mocked(getUserSets).mockReset();
            vi.mocked(putUserSet).mockReset();
        });

        it('should send put user content and return result', async () => {
            const expectedResult: Set = {
                ...set,
                tag: 'tag updated',
                updated_date: updatedSet.updated_date,
            };

            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(putUserSet).mockResolvedValue(updatedSet);

            const result = await updateSetTag(updateSetTagBody, accessToken, setId);

            expect(result).toEqual(expectedResult);
            expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(putUserSet).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect(vi.mocked(putUserSet).mock.calls[0][2]).toEqual(setId);
        });

        it('should return an error if set to update does not exist', async () => {
            vi.mocked(getUserSets).mockResolvedValue([]);
            vi.mocked(putUserSet).mockResolvedValue(updatedSet);

            try {
                await updateSetTag(updateSetTagBody, accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(0);
            }
        });

        it('should send put user content and return error if update throws an error', async () => {
            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(putUserSet).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetTag(updateSetTagBody, accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(putUserSet).mock.calls[0][0]).toEqual(accessToken);
                expect(vi.mocked(putUserSet).mock.calls[0][1]).toEqual(expectedUpdateBody);
                expect(vi.mocked(putUserSet).mock.calls[0][2]).toEqual(setId);
            }
        });
    });

    describe('Update set content', () => {
        const newSqon = { op: 'and', content: [{ op: 'in', content: { field: 'affected_status', value: ['false'] } }] };
        const mockNewSqonParticipantIds = ['participant_1', 'participant_3'];

        const mockExistingSets = [userSet];

        const updateSetContentAddSqon: UpdateSetContentBody = {
            sourceType: 'SAVE_SET',
            subAction: SubActionTypes.ADD_IDS,
            sqon: newSqon,
        };

        const updateSetContentRemoveSqon = { ...updateSetContentAddSqon, subAction: SubActionTypes.REMOVE_IDS };

        beforeEach(() => {
            vi.mocked(getUserSets).mockReset();
            vi.mocked(putUserSet).mockReset();
            vi.mocked(resolveSetsInSqon).mockReset();
            vi.mocked(searchSqon).mockReset();
        });

        it('should send put user content and return result - case add ids', async () => {
            const expectedAddSqon = { op: 'or', content: [sqon, newSqon] };
            const updatedUserSet: UserSet = {
                ...userSet,
                content: {
                    ...userSet.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
                updated_date: new Date(),
            };

            const updatedSet: Set = {
                ...set,
                size: 3,
                updated_date: updatedUserSet.updated_date,
            };

            const expectedUpdateBody: CreateUpdateBody = {
                alias: userSet.alias,
                sharedPublicly: userSet.sharedpublicly,
                content: {
                    ...userSet.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
            };

            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(resolveSetsInSqon).mockImplementation(async sqon => sqon);
            vi.mocked(searchSqon).mockResolvedValue(mockNewSqonParticipantIds);
            vi.mocked(putUserSet).mockResolvedValue(updatedUserSet);

            const result = await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, runInternalQuery);

            expect(result).toEqual(updatedSet);
            expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(putUserSet).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect(vi.mocked(putUserSet).mock.calls[0][2]).toEqual(setId);
        });

        it('should resolve set id in sqon before send put user content and return result - case add ids', async () => {
            const newSqonWithSetId = {
                op: 'and',
                content: [{ op: 'in', content: { field: 'kf_id', value: ['set_id:1b1'] } }],
            };
            const newSqonWithResolvedSet = {
                op: 'and',
                content: [{ op: 'in', content: { field: 'kf_id', value: mockNewSqonParticipantIds } }],
            };
            const expectedAddSqon = { op: 'or', content: [sqon, newSqonWithSetId] };
            const updatedUserSet: UserSet = {
                ...userSet,
                content: {
                    ...userSet.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
                updated_date: new Date(),
            };
            const updatedSet: Set = {
                ...set,
                size: 3,
                updated_date: updatedUserSet.updated_date,
            };

            const expectedUpdateBody: CreateUpdateBody = {
                alias: userSet.alias,
                sharedPublicly: userSet.sharedpublicly,
                content: {
                    ...userSet.content,
                    sqon: expectedAddSqon,
                    ids: ['participant_1', 'participant_2', 'participant_3'],
                },
            };

            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(resolveSetsInSqon).mockResolvedValue(newSqonWithResolvedSet);
            vi.mocked(searchSqon).mockResolvedValue(mockNewSqonParticipantIds);
            vi.mocked(putUserSet).mockResolvedValue(updatedUserSet);

            const result = await updateSetContent(
                { ...updateSetContentAddSqon, sqon: newSqonWithSetId },
                accessToken,
                userId,
                setId,
                runInternalQuery,
            );

            expect(result).toEqual(updatedSet);
            expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetsInSqon).mock.calls[0][0]).toEqual(newSqonWithSetId);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(searchSqon).mock.calls[0][0]).toEqual(newSqonWithResolvedSet);
            expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(putUserSet).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect(vi.mocked(putUserSet).mock.calls[0][2]).toEqual(setId);
        });

        it('should send put user content and return result - case remove ids', async () => {
            const expectedRemoveSqon = {
                op: 'and',
                content: [sqon, { op: 'not', content: [newSqon] }],
            };
            const updatedUserSet: UserSet = {
                ...userSet,
                content: {
                    ...userSet.content,
                    sqon: expectedRemoveSqon,
                    ids: ['participant_2'],
                },
                updated_date: new Date(),
            };
            const updatedSet: Set = {
                ...set,
                size: 1,
                updated_date: updatedUserSet.updated_date,
            };

            const expectedUpdateBody: CreateUpdateBody = {
                alias: userSet.alias,
                sharedPublicly: userSet.sharedpublicly,
                content: {
                    ...userSet.content,
                    sqon: expectedRemoveSqon,
                    ids: ['participant_2'],
                },
            };

            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(resolveSetsInSqon).mockImplementation(async sqon => sqon);
            vi.mocked(searchSqon).mockResolvedValue(mockNewSqonParticipantIds);
            vi.mocked(putUserSet).mockResolvedValue(updatedUserSet);

            const result = await updateSetContent(updateSetContentRemoveSqon, accessToken, userId, setId, runInternalQuery);

            expect(result).toEqual(updatedSet);
            expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(putUserSet).mock.calls[0][0]).toEqual(accessToken);
            expect(vi.mocked(putUserSet).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect(vi.mocked(putUserSet).mock.calls[0][2]).toEqual(setId);
        });

        it('should return an error if set to update does not exist', async () => {
            vi.mocked(getUserSets).mockResolvedValue([]);

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, runInternalQuery);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(0);
                expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(0);
                expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(0);
            }
        });

        it('should send put user content and return error if update throws an error', async () => {
            vi.mocked(getUserSets).mockResolvedValue(mockExistingSets);
            vi.mocked(resolveSetsInSqon).mockImplementation(async sqon => sqon);
            vi.mocked(searchSqon).mockResolvedValue(mockNewSqonParticipantIds);
            vi.mocked(putUserSet).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, runInternalQuery);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect(vi.mocked(getUserSets)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(resolveSetsInSqon)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(searchSqon)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(putUserSet)).toHaveBeenCalledTimes(1);
            }
        });
    });

    describe('Delete set', () => {
        beforeEach(() => {
            vi.mocked(searchSqon).mockReset();
            vi.mocked(deleteUserSet).mockReset();
        });

        it('should send delete and return result', async () => {
            vi.mocked(deleteUserSet).mockResolvedValue(setId);

            const result = await deleteSet(accessToken, setId);

            expect(result).toEqual(setId);
            expect(vi.mocked(deleteUserSet)).toHaveBeenCalledTimes(1);
        });

        it('should send delete and return error if delete throws an error', async () => {
            vi.mocked(deleteUserSet).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await deleteSet(accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect(vi.mocked(deleteUserSet)).toHaveBeenCalledTimes(1);
            }
        });
    });
});
