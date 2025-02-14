import { ArrangerProject } from '../../arrangerUtils';
import { resolveSetsInSqon } from '../../sqon/resolveSetInSqon';
import { searchSqon } from '../../sqon/searchSqon';
import { deleteUserSet, getUserSets, postUserSet, putUserSet, UserSet } from '../../userApi/userApiClient';
import { createSet, deleteSet, getSets, SubActionTypes, updateSetContent, updateSetTag } from './setsFeature';
import {
    CreateSetBody,
    CreateUpdateBody,
    RIFF_TYPE_SET,
    Set,
    Sort,
    UpdateSetContentBody,
    UpdateSetTagBody,
} from './setsTypes';

jest.mock('../../sqon/resolveSetInSqon');
jest.mock('../../sqon/searchSqon');
jest.mock('../../userApi/userApiClient');
jest.mock('../../env', () => ({
    esHost: 'http://localhost:9200',
    maxSetContentSize: 3,
}));

describe('Set management', () => {
    const sqon = { op: 'and', content: [] };
    const tag = 'tag';
    const idField = 'kf_id';
    const projectId = '2021_05_03_v2';
    const type = 'participant';
    const sort: Sort[] = [];
    const accessToken = 'Bearer bearer';
    const setId = '1ea';
    const userId = 'user_id';
    const getProject = (_s: string) => ({} as ArrangerProject);

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
    };

    describe('Get user sets using Users-API', () => {
        beforeEach(() => {
            (getUserSets as jest.Mock).mockReset();
        });

        it('should send get user contents and convert to Set', async () => {
            const mockUserSets = [userSet];
            const expectedSets: Set[] = [set];
            (getUserSets as jest.Mock).mockImplementation(() => mockUserSets);

            const result = await getSets(accessToken);

            expect(result).toEqual(expectedSets);
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send get user contents and return error if get request throws an error', async () => {
            (getUserSets as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await getSets(accessToken);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Create a set', () => {
        const createSetBody: CreateSetBody = {
            idField,
            projectId,
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
            (resolveSetsInSqon as jest.Mock).mockReset();
            (searchSqon as jest.Mock).mockReset();
            (postUserSet as jest.Mock).mockReset();
        });

        it('should send post user set and return result', async () => {
            (resolveSetsInSqon as jest.Mock).mockImplementation(sqon => sqon);
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postUserSet as jest.Mock).mockImplementation(() => userSet);

            const result = await createSet(createSetBody, accessToken, userId, getProject);

            expect(result).toEqual(set);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((postUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedCreatesSetBody);
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

            (resolveSetsInSqon as jest.Mock).mockImplementation(() => sqonWithResolvedSetId);
            (searchSqon as jest.Mock).mockImplementation(() => mockParticipantIds);
            (postUserSet as jest.Mock).mockImplementation(() => userSet);

            const result = await createSet({ ...createSetBody, sqon: sqonWithSetId }, accessToken, userId, getProject);

            expect(result).toEqual(set);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((resolveSetsInSqon as jest.Mock).mock.calls[0][0]).toEqual(sqonWithSetId);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((postUserSet as jest.Mock).mock.calls[0][1]).toEqual({
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
            (resolveSetsInSqon as jest.Mock).mockImplementation(sqon => sqon);
            (searchSqon as jest.Mock).mockImplementation(() => mockTooLongParticipantIds);
            (postUserSet as jest.Mock).mockImplementation(() => truncatedUserSet);

            const result = await createSet(createSetBody, accessToken, userId, getProject);

            expect(result).toEqual(expectedSet);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((postUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((postUserSet as jest.Mock).mock.calls[0][1]).toEqual({
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
            (getUserSets as jest.Mock).mockReset();
            (putUserSet as jest.Mock).mockReset();
        });

        it('should send put user content and return result', async () => {
            const expectedResult: Set = {
                ...set,
                tag: 'tag updated',
                updated_date: updatedSet.updated_date,
            };

            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (putUserSet as jest.Mock).mockImplementation(() => updatedSet);

            const result = await updateSetTag(updateSetTagBody, accessToken, setId);

            expect(result).toEqual(expectedResult);
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect((putUserSet as jest.Mock).mock.calls[0][2]).toEqual(setId);
        });

        it('should return an error if set to update does not exist', async () => {
            (getUserSets as jest.Mock).mockImplementation(() => []);
            (putUserSet as jest.Mock).mockImplementation(() => updatedSet);

            try {
                await updateSetTag(updateSetTagBody, accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
                expect((putUserSet as jest.Mock).mock.calls.length).toEqual(0);
            }
        });

        it('should send put user content and return error if update throws an error', async () => {
            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (putUserSet as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetTag(updateSetTagBody, accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
                expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
                expect((putUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
                expect((putUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateBody);
                expect((putUserSet as jest.Mock).mock.calls[0][2]).toEqual(setId);
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
            projectId,
            sqon: newSqon,
        };

        const updateSetContentRemoveSqon = { ...updateSetContentAddSqon, subAction: SubActionTypes.REMOVE_IDS };

        beforeEach(() => {
            (getUserSets as jest.Mock).mockReset();
            (putUserSet as jest.Mock).mockReset();
            (resolveSetsInSqon as jest.Mock).mockReset();
            (searchSqon as jest.Mock).mockReset();
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

            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (resolveSetsInSqon as jest.Mock).mockImplementation(sqon => sqon);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putUserSet as jest.Mock).mockImplementation(() => updatedUserSet);

            const result = await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, getProject);

            expect(result).toEqual(updatedSet);
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect((putUserSet as jest.Mock).mock.calls[0][2]).toEqual(setId);
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

            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (resolveSetsInSqon as jest.Mock).mockImplementation(() => newSqonWithResolvedSet);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putUserSet as jest.Mock).mockImplementation(() => updatedUserSet);

            const result = await updateSetContent(
                { ...updateSetContentAddSqon, sqon: newSqonWithSetId },
                accessToken,
                userId,
                setId,
                getProject,
            );

            expect(result).toEqual(updatedSet);
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((resolveSetsInSqon as jest.Mock).mock.calls[0][0]).toEqual(newSqonWithSetId);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls[0][0]).toEqual(newSqonWithResolvedSet);
            expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect((putUserSet as jest.Mock).mock.calls[0][2]).toEqual(setId);
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

            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (resolveSetsInSqon as jest.Mock).mockImplementation(sqon => sqon);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putUserSet as jest.Mock).mockImplementation(() => updatedUserSet);

            const result = await updateSetContent(updateSetContentRemoveSqon, accessToken, userId, setId, getProject);

            expect(result).toEqual(updatedSet);
            expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
            expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
            expect((putUserSet as jest.Mock).mock.calls[0][0]).toEqual(accessToken);
            expect((putUserSet as jest.Mock).mock.calls[0][1]).toEqual(expectedUpdateBody);
            expect((putUserSet as jest.Mock).mock.calls[0][2]).toEqual(setId);
        });

        it('should return an error if set to update does not exist', async () => {
            (getUserSets as jest.Mock).mockImplementation(() => []);

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, getProject);
            } catch (e) {
                expect(e.message).toEqual('Set to update can not be found !');
            } finally {
                expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
                expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(0);
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(0);
                expect((putUserSet as jest.Mock).mock.calls.length).toEqual(0);
            }
        });

        it('should send put user content and return error if update throws an error', async () => {
            (getUserSets as jest.Mock).mockImplementation(() => mockExistingSets);
            (resolveSetsInSqon as jest.Mock).mockImplementation(sqon => sqon);
            (searchSqon as jest.Mock).mockImplementation(() => mockNewSqonParticipantIds);
            (putUserSet as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await updateSetContent(updateSetContentAddSqon, accessToken, userId, setId, getProject);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((getUserSets as jest.Mock).mock.calls.length).toEqual(1);
                expect((resolveSetsInSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((searchSqon as jest.Mock).mock.calls.length).toEqual(1);
                expect((putUserSet as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });

    describe('Delete set', () => {
        beforeEach(() => {
            (searchSqon as jest.Mock).mockReset();
            (deleteUserSet as jest.Mock).mockReset();
        });

        it('should send delete and return result', async () => {
            (deleteUserSet as jest.Mock).mockImplementation(() => true);

            const result = await deleteSet(accessToken, setId);

            expect(result).toEqual(true);
            expect((deleteUserSet as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('should send delete and return error if delete throws an error', async () => {
            (deleteUserSet as jest.Mock).mockImplementation(() => {
                throw new Error('OOPS');
            });

            try {
                await deleteSet(accessToken, setId);
            } catch (e) {
                expect(e.message).toEqual('OOPS');
            } finally {
                expect((deleteUserSet as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
