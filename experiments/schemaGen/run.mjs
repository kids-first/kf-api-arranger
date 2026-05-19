// Runs the schema generator against the dumped real data and writes the SDL.
// Then runs the diff against arranger's emitted SDL for the entity Node type.

import fs from 'node:fs';
import { printSchema } from 'graphql';
import { buildFieldTree } from './fieldTree.mjs';
import { loadExtendedMapping } from './extendedMapping.mjs';
import { buildSchema } from './buildSchema.mjs';
import { extractNodeType, diffNodeTypes } from './compareSdl.mjs';

const MAPPING_PATH = 'experiments/data/mappings/study_centric.json';
const PROJECTS_PATH = 'experiments/data/arranger-projects/include.json';
const ARRANGER_SDL_PATH = 'experiments/data/arranger-sdl/include.graphql';

const ES_INDEX = 'study_centric';   // _id in arranger-projects-include
const ENTITY_NAME = 'study';        // graphqlField name

const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
const tree = buildFieldTree(mapping);
const extendedMap = loadExtendedMapping(PROJECTS_PATH, ES_INDEX);

const schema = buildSchema({ tree, extendedMap, entityName: ENTITY_NAME });
const oursSdl = printSchema(schema);
fs.writeFileSync('experiments/data/our-sdl/study.graphql', oursSdl);

const arrangerSdl = fs.readFileSync(ARRANGER_SDL_PATH, 'utf8');
const arrangerNode = extractNodeType(arrangerSdl, `${ENTITY_NAME}Node`);
const oursNode = extractNodeType(oursSdl, `${ENTITY_NAME}Node`);

console.log('=== arranger studyNode lines:', arrangerNode.split('\n').length);
console.log('=== ours     studyNode lines:', oursNode.split('\n').length);
console.log();

const result = diffNodeTypes(arrangerNode, oursNode);
console.log(result.summary);
if (result.unifiedDiff) {
    console.log('\n--- unified diff (arranger ⇄ ours) ---');
    console.log(result.unifiedDiff);
}

// Report unsupported fields encountered
const unsupported = tree.fields.filter(f => f.kind === 'unsupported');
if (unsupported.length) {
    console.log('\nUnsupported fields skipped:');
    for (const f of unsupported) console.log(`  ${f.name} (esType=${f.esType})`);
}
