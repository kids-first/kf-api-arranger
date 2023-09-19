import { updateFieldExtendedMapping } from '@arranger/admin/dist/schemas/ExtendedMapping/utils';
import { createNewIndex, getProjectMetadataEsLocation } from '@arranger/admin/dist/schemas/IndexSchema/utils';
import { addArrangerProject } from '@arranger/admin/dist/schemas/ProjectSchema/utils';
import { constants } from '@arranger/admin/dist/services/constants';

const createNewIndices = async (esClient, confIndices) => {
    const createNewIndexWithClient = createNewIndex(esClient);
    for (const confIndex of confIndices) {
        await createNewIndexWithClient({ ...confIndex });
    }
};

const fixExtendedMapping = async (esClient, confExtendedMappingMutations) => {
    const updateFieldExtendedMappingWithClient = updateFieldExtendedMapping(esClient);
    for (const confExtendedMappingMutation of confExtendedMappingMutations) {
        console.debug("fixing extendedMapping field =", confExtendedMappingMutation?.field)
        await updateFieldExtendedMappingWithClient({
            ...confExtendedMappingMutation,
        });
    }
};

export const ArrangerApi = {
    addArrangerProject,
    createNewIndices,
    fixExtendedMapping,
    getProjectMetadataEsLocation,
    constants,
};
