/* eslint-disable no-console */
import 'regenerator-runtime/runtime';

import EsInstance from '../dist/src/ElasticSearchClientInstance';
import { countNOfDocs, createIndexIfNeeded } from '../dist/src/esUtils';

import { ArrangerApi } from './arrangerApi.mjs';
import { projectsConfig } from './projectsConfig.mjs';
import { esHost } from '../dist/src/env.js';

const hasProjectArrangerMetadataIndex = async (esClient, projectName) => {
    const r = await esClient.indices.exists({
        index: ArrangerApi.getProjectMetadataEsLocation(projectName).index,
    });
    return !!r?.body;
};

const isProjectListedInArranger = async (esClient, projectName) => {
    const r = await esClient.exists({
        index: ArrangerApi.constants.ARRANGER_PROJECT_INDEX,
        id: projectName,
    });
    return !!r?.body;
};

const sameIndices = (xs, ys) => {
    const s = new Set(ys);
    return xs.length === ys.length && xs.every(x => s.has(x));
};

//===== Start =====//
console.info(`admin-project-script - Starting script`);

//values are hardcoded for now, but as soon as possible, we should use env var from env.ts
const projectIndices =
    ['migration_test_participant_centric', 'migration_test_study_centric', 'variant_centric']?.filter(p => !!p)?.map(p => p?.trim()) ?? [];

if (projectIndices.length === 0) {
    console.warn(
        `admin-project-script - Terminating. No indices needed to build a project was found in the env var 'PROJECT_INDICES'.`,
    );
    process.exit(0);
}

const allProjectsConf = projectsConfig();

const projectsConf = allProjectsConf.filter(p => {
    const indicesInConf = p.indices.map(i => i.esIndex);
    // indices in conf are the same as target indices from env vars?
    return sameIndices(indicesInConf, projectIndices);
});

if (projectsConf.length === 0) {
    console.info('admin-project-script - Terminating. Found no project configuration to process.');
    process.exit(0);
} else if (projectsConf.length > 1) {
    console.info(
        'admin-project-script - Terminating. Found more than one candidates for project configurations. This is ambiguous.',
    );
    process.exit(0);
}

const projectConf = projectsConf[0];

console.debug(`admin-project-script - Reaching to ElasticSearch at ${esHost}`);
const client = await EsInstance.default.getInstance();

const addArrangerProjectWithClient = ArrangerApi.addArrangerProject(client);

const hasCreatedIndex = await createIndexIfNeeded(client, ArrangerApi.constants.ARRANGER_PROJECT_INDEX);
if (hasCreatedIndex) {
    console.info(
        `admin-project-script - Created this index: '${ArrangerApi.constants.ARRANGER_PROJECT_INDEX}'. Since no existing arranger projects detected.`,
    );
}

const projectName = projectConf.name;

const resolveSanityConditions = async () =>
    await Promise.all([
        hasProjectArrangerMetadataIndex(client, projectName),
        isProjectListedInArranger(client, projectName),
    ]);

const creationConditions = await resolveSanityConditions();
if (creationConditions.every(b => !b)) {
    console.debug(
        `admin-project-script - Creating a new metadata project since no existing project='${projectName}' detected.`,
    );
    const addResp = await addArrangerProjectWithClient(projectName);
    console.debug(`admin-project-script - (Project addition) received this response from arranger api: `, addResp);
    console.debug(
        `admin-project-script - Creating these new graphql fields: ${projectConf.indices
            .map(i => `'${i.graphqlField}' from es index '${i.esIndex}'`)
            .join(', ')}`,
    );
    await ArrangerApi.createNewIndices(client, projectConf.indices);
} else if (creationConditions.some(b => b !== creationConditions[0])) {
    console.warn(
        `admin-project-script - The project seems to be in a weird state for '${projectName}' does ${
            creationConditions[0] ? '' : 'not '
        }exist while it is ${creationConditions[1] ? '' : 'not '}listed in ${
            ArrangerApi.constants.ARRANGER_PROJECT_INDEX
        }`,
    );
}

const updateConditions = await resolveSanityConditions();
if (updateConditions.every(b => b)) {
    const nOfDocsInProjectMetadata = await countNOfDocs(
        client,
        ArrangerApi.getProjectMetadataEsLocation(projectName).index,
    );
    if (nOfDocsInProjectMetadata === projectConf.indices.length) {
        console.debug(`admin-project-script - Applying extended mapping mutations.`);
        await ArrangerApi.fixExtendedMapping(client, projectConf.extendedMappingMutations);
    }
}

console.debug(`admin-project-script - Terminating script.`);
process.exit(0);
