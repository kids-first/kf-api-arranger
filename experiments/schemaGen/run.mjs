// Runs the schema generator against the dumped real data and writes the SDL.
// Then runs the diff against arranger's emitted SDL for the entity Node type.
//
// Usage: node experiments/schemaGen/run.mjs <es_index>
//   e.g. node experiments/schemaGen/run.mjs study_centric
//        node experiments/schemaGen/run.mjs participant_centric

import fs from 'node:fs';
import { printSchema } from 'graphql';
import { buildFieldTree } from './fieldTree.mjs';
import { loadExtendedMapping } from './extendedMapping.mjs';
import { buildSchema } from './buildSchema.mjs';
import { extractNodeType, diffNodeTypes } from './compareSdl.mjs';

const esIndex = process.argv[2];
if (!esIndex) {
    console.error('Usage: node experiments/schemaGen/run.mjs <es_index>');
    console.error('  e.g. study_centric, participant_centric, variant_centric');
    process.exit(1);
}

const MAPPING_PATH = `experiments/data/mappings/${esIndex}.json`;
const PROJECTS_PATH = 'experiments/data/arranger-projects/include.json';
const ARRANGER_SDL_PATH = 'experiments/data/arranger-sdl/include.graphql';

const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
const tree = buildFieldTree(mapping);
const { map: extendedMap, entityName } = loadExtendedMapping(PROJECTS_PATH, esIndex);

const schema = buildSchema({ tree, extendedMap, entityName });
const oursSdl = printSchema(schema);
const outPath = `experiments/data/our-sdl/${entityName}.graphql`;
fs.writeFileSync(outPath, oursSdl);

const arrangerSdl = fs.readFileSync(ARRANGER_SDL_PATH, 'utf8');
const arrangerNode = extractNodeType(arrangerSdl, `${entityName}Node`);
const oursNode = extractNodeType(oursSdl, `${entityName}Node`);

console.log(`=== entity: ${entityName}  (es_index: ${esIndex})`);
console.log(`=== arranger ${entityName}Node lines:`, arrangerNode.split('\n').length);
console.log(`=== ours     ${entityName}Node lines:`, oursNode.split('\n').length);
console.log();

const result = diffNodeTypes(arrangerNode, oursNode);
console.log(result.summary);
if (result.unifiedDiff) {
    console.log('\n--- unified diff (arranger ⇄ ours) ---');
    console.log(result.unifiedDiff);
}

console.log(`\nchar-by-char identical? ${arrangerNode === oursNode}`);

const unsupported = tree.fields.filter(f => f.kind === 'unsupported');
if (unsupported.length) {
    console.log('\nUnsupported fields skipped:');
    for (const f of unsupported) console.log(`  ${f.name} (esType=${f.esType})`);
}
