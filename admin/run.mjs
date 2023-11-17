// docker run -u node -it --rm --network host -v ${PWD}:/code --workdir /code node:18-alpine3.18 sh
// examples: npm run admin-project p:include e:include OR npm run admin-project p:next_prd (will default to kf)
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

const ENV = {
    kf: 'kf',
    include: 'include',
};

const args = process.argv.slice(2);

//de-hardcode when possible
const SUPPORTED_PROJECT_NAMES = ['next_prd', 'next_qa', '2023_01_26_v1', 'include'];
const projectArg = args.find(a => a.startsWith('p:'))?.split(":")[1];
if (!projectArg || !SUPPORTED_PROJECT_NAMES.some(sp => sp === projectArg)) {
    console.warn(
        `admin-project-script - You must input a supported arranger project name. Got "${projectArg}" where supported values are: "${SUPPORTED_PROJECT_NAMES.join(', ')}"`,
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
//values are hardcoded for now, but as soon as possible, we should use env var from env.ts
const kfNext = [
    'next_participant_centric',
    'next_study_centric',
    'next_biospecimen_centric',
    'next_file_centric',
    'next_variant_centric',
    'next_gene_centric',
    'members-public',
];

const include = [
    'participant_centric',
    'study_centric',
    'biospecimen_centric',
    'file_centric',
    'variant_centric',
    'gene_centric',
];

const envToIndicesPrefixes = {
    kf: kfNext,
    include: include,
};

const indicesPrefixes = envToIndicesPrefixes[envVal];

const projectIndices = indicesPrefixes?.filter(p => !!p)?.map(p => p?.trim()) ?? [];

if (projectIndices.length === 0) {
    console.warn(
        `admin-project-script - Terminating. No indices needed to build a project was found in the env var 'PROJECT_INDICES'.`,
    );
    process.exit(0);
}

const projectName = projectArg;

//TODO: refactor to tolerate only 1 project per conf
const allProjectsConf = projectsConfig(projectName, envVal);

const projectsConf = allProjectsConf.filter(p => {
    const indicesInConf = p.indices.map(i => i.esIndex);
    // indices in conf are the same as target indices from env vars?
    return sameIndices(indicesInConf, projectIndices);
});

if (projectsConf.length === 0) {
    console.info(
        'admin-project-script - Terminating. Found no sane project configuration to process. Make sure it exists and that if matches with project indices.',
    );
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
