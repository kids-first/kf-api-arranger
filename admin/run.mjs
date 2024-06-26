// docker run -u node -it --rm --network host -v ${PWD}:/code --workdir /code node:20-alpine3.18 sh
// examples: npm run admin-project p:include e:include test OR npm run admin-project p:next_prd (will default to kf)
//kf-api-arranger/node_modules/@arranger/mapping-utils/dist/extendMapping.js change  rangeStep: ['double', 'float', 'half_float', 'scaled_float'].includes(type) ? 0.01 : 1 to rangeStep: 1.0
/* eslint-disable no-console */
import 'regenerator-runtime/runtime.js';

import EsInstance from '../dist/src/ElasticSearchClientInstance.js';
import { countNOfDocs, createIndexIfNeeded } from '../dist/src/esUtils.js';

import { ArrangerApi } from './arrangerApi.mjs';
import { projectsConfig } from './projectsConfig.mjs';
import { esHost } from '../dist/src/env.js';
import { clinicalIndexStems, isClinicalIndex } from './releaseStatsUtils.mjs';

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
const SUPPORTED_PROJECT_NAMES = ['next_prd', 'next_qa', 'include', 'test'];
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

const isTest = args.some(a => a === 'test');
const appendTestIfNeeded = x => (isTest && isClinicalIndex(x) ? `${x}_test` : x);
if (isTest) {
    const allAliases = await client.cat.aliases({
        h: 'alias',
        format: 'json',
    });
    const clinicalTestAliases = allAliases.body
        .filter(x => isClinicalIndex(x.alias) && x.alias.endsWith('_test'))
        .map(x => x.alias);
    if (!clinicalTestAliases || !clinicalIndexStems.every(s => clinicalTestAliases.some(x => x.includes(s)))) {
        console.debug(
            `admin-project-script - Terminating. When creating a test, all clinical entities must be aliased with _test suffix`,
        );
        console.debug(`admin-project-script - received test aliases: `);
        console.debug(clinicalTestAliases);
        process.exit(1);
    }
}
//values are hardcoded for now, but as soon as possible, we should use env var from env.ts
const kfNext = [
    'next_participant_centric',
    'next_study_centric',
    'next_biospecimen_centric',
    'next_file_centric',
    'next_variant_centric',
    'next_gene_centric',
    'members-public',
].map(x => (isTest && isClinicalIndex(x) ? appendTestIfNeeded(x) : x));

const include = [
    'participant_centric',
    'study_centric',
    'biospecimen_centric',
    'file_centric',
    'variant_centric',
    'gene_centric',
].map(x => (isTest && isClinicalIndex(x) ? appendTestIfNeeded(x) : x));

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

const projectsConf = allProjectsConf
    .map(x => ({ ...x, indices: x.indices.map(i => ({ ...i, esIndex: appendTestIfNeeded(i.esIndex) })) }))
    .filter(p => {
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
        projectConf.indices.map(i => `${i.graphqlField}' from es index '${i.esIndex}`),
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
        console.time("fixExtendedMapping")
        await ArrangerApi.fixExtendedMapping(client, projectConf.extendedMappingMutations);
        console.timeEnd("fixExtendedMapping")
    }
}

console.debug(`admin-project-script - Terminating script.`);
process.exit(0);
