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

const fixExtendedMapping = async (esClient, mutations) => {
    console.time(`fixExtendedMapping`)
    const updateFieldExtendedMappingWithClient = updateFieldExtendedMapping(esClient);
    for (const [index, mutation] of mutations.entries()) {
        console.debug('updating field = ', mutation?.field, ` ${index + 1} of ${mutations.length}`);
        await updateFieldExtendedMappingWithClient({
            ...mutation,
        });
    }
    console.timeEnd(`fixExtendedMapping`)
};

export const ArrangerApi = {
    addArrangerProject,
    createNewIndices,
    fixExtendedMapping,
    getProjectMetadataEsLocation,
    constants,
};
