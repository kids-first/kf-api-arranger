import { updateFieldExtendedMapping } from '@arranger/admin/dist/schemas/ExtendedMapping/utils.js';
import { createNewIndex, getProjectMetadataEsLocation } from '@arranger/admin/dist/schemas/IndexSchema/utils.js';
import { addArrangerProject } from '@arranger/admin/dist/schemas/ProjectSchema/utils.js';
import { constants } from '@arranger/admin/dist/services/constants.js';

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
