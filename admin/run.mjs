// docker run -u node -it --rm --network host -v ${PWD}:/code --workdir /code node:20-alpine3.18 sh
// examples: npm run admin-project p:include e:include OR npm run admin-project p:prd (will default to kf)
//kf-api-arranger/node_modules/@arranger/mapping-utils/dist/extendMapping.js change  rangeStep: ['double', 'float', 'half_float', 'scaled_float'].includes(type) ? 0.01 : 1 to rangeStep: 1.0
/* eslint-disable no-console */
import 'regenerator-runtime/runtime.js';

import EsInstance from '../dist/src/ElasticSearchClientInstance.js';
import { countNOfDocs, createIndexIfNeeded } from '../dist/src/esUtils.js';

import { ArrangerApi } from './arrangerApi.mjs';
import { projectConfig } from './projectConfig.mjs';
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

const ENV = {
    kf: 'kf',
    include: 'include',
};

const args = process.argv.slice(2);

//de-hardcode when possible
const SUPPORTED_PROJECT_NAMES = ['prd', 'qa', 'include'];
const projectArg = args.find(a => a.startsWith('p:'))?.split(':')[1];
if (!projectArg || !SUPPORTED_PROJECT_NAMES.some(sp => sp === projectArg)) {
    console.warn(
        `admin-project-script - You must input a supported arranger project name. Got "${projectArg}" where supported values are: "${SUPPORTED_PROJECT_NAMES.join(
            ', ',
        )}"`,
    );
    process.exit(1);
}

const envArg = args.find(a => a.startsWith('e:')) ?? '';
let envVal = ENV.kf;
if (envArg) {
    const value = envArg.split(':')[1].toLocaleLowerCase();
    if (Object.values(ENV).includes(value)) {
        envVal = ENV[value];
    } else {
        console.warn(
            `admin-project-script - Unsupported project "${value}". Supported projects are: "${Object.values(ENV).join(
                ', ',
            )}"`,
        );
    }
}

//===== Start =====//
console.info(`admin-project-script - Starting script`);
console.info(`admin-project-script - Project value is=${envVal}`);

console.debug(`admin-project-script - Reaching to ElasticSearch at ${esHost}`);
const client = await EsInstance.default.getInstance();

const projectName = projectArg;

const arrangerProjectConf = projectConfig(projectName);

const addArrangerProjectWithClient = ArrangerApi.addArrangerProject(client);

const hasCreatedIndex = await createIndexIfNeeded(client, ArrangerApi.constants.ARRANGER_PROJECT_INDEX);
if (hasCreatedIndex) {
    console.info(
        `admin-project-script - Created this index: '${ArrangerApi.constants.ARRANGER_PROJECT_INDEX}'. Since no existing arranger projects detected.`,
    );
}

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
        `admin-project-script - Creating these new graphql fields: `,
        arrangerProjectConf.indices.map(i => `${i.graphqlField}' from es index '${i.esIndex}`),
    );
    await ArrangerApi.createNewIndices(client, arrangerProjectConf.indices);
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
    if (nOfDocsInProjectMetadata === arrangerProjectConf.indices.length) {
        console.debug(`admin-project-script - Applying extended mapping mutations.`);
        console.time('fixExtendedMapping');
        await ArrangerApi.fixExtendedMapping(client, arrangerProjectConf.extendedMappingMutations);
        console.timeEnd('fixExtendedMapping');
    }
}

console.debug(`admin-project-script - Terminating script.`);
process.exit(0);
