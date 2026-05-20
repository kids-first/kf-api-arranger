// Smoke test for the TS schema port — not part of the runtime server.
//
// Usage:
//   npx tsx src/schema/__check__.ts <es_index>
//   e.g. npx tsx src/schema/__check__.ts study_centric
//
// Verifies:
//   1. Generated <entity>Node block is byte-identical to arranger's reference
//      SDL (the regression test for the sessions 1+2 result).
//   2. New wrapper types (<entity>, <entity>Connection, <entity>Edge, Root)
//      are well-formed and parse-printable.

import fs from 'node:fs';
import { printSchema } from 'graphql';
import { loadSchema } from './index.js';

const REPO_ROOT = '..'; // when running from server-v2/

const esIndex = process.argv[2];
if (!esIndex) {
    console.error('Usage: npx tsx src/schema/__check__.ts <es_index>');
    console.error('  e.g. study_centric, participant_centric');
    process.exit(1);
}

const { schema, entityName } = loadSchema({
    mappingPath: `${REPO_ROOT}/experiments/data/mappings/${esIndex}.json`,
    projectsPath: `${REPO_ROOT}/experiments/data/arranger-projects/include.json`,
    esIndex,
});

const oursSdl = printSchema(schema);

const arrangerSdl = fs.readFileSync(
    `${REPO_ROOT}/experiments/data/arranger-sdl/include.graphql`,
    'utf8',
);

const arrangerNode = extractTypeBlock(arrangerSdl, `${entityName}Node`);
const oursNode = extractTypeBlock(oursSdl, `${entityName}Node`);

console.log(`=== entity: ${entityName}  (es_index: ${esIndex})`);
console.log(`=== arranger ${entityName}Node lines:`, arrangerNode.split('\n').length);
console.log(`=== ours     ${entityName}Node lines:`, oursNode.split('\n').length);
console.log();
console.log(`Node block char-by-char identical? ${arrangerNode === oursNode}`);
console.log();

const wrappers = ['Node', `${entityName}Edge`, `${entityName}Connection`, entityName, 'Root'];
console.log('--- wrapper types emitted ---');
for (const t of wrappers) {
    const block = tryExtractTypeBlock(oursSdl, t);
    if (block) {
        console.log(`\n${block}`);
    } else {
        console.log(`MISSING: ${t}`);
    }
}

function extractTypeBlock(sdl: string, typeName: string): string {
    const re = new RegExp(
        `^type ${escapeRe(typeName)}(?:\\s+implements\\s+[^{]+)?\\s*\\{[^}]*\\}`,
        'm',
    );
    const m = sdl.match(re);
    if (!m) throw new Error(`Could not find "type ${typeName}" in SDL`);
    return m[0];
}

function tryExtractTypeBlock(sdl: string, typeName: string): string | null {
    const re = new RegExp(
        `^(?:type|interface) ${escapeRe(typeName)}(?:\\s+implements\\s+[^{]+)?\\s*\\{[^}]*\\}`,
        'm',
    );
    const m = sdl.match(re);
    return m ? m[0] : null;
}

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
