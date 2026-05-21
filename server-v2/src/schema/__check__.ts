// Smoke test for the TS schema port — not part of the runtime server.
//
// Usage:
//   npx tsx src/schema/__check__.ts <es_index>
//   e.g. npx tsx src/schema/__check__.ts study_centric
//
// Verifies:
//   1. Generated <entity>Node block is byte-identical to arranger's reference
//      SDL (the regression test for the sessions 1+2 result).
//   2. Slice-S wrapper types (<entity>, <entity>Connection, <entity>Edge, Root)
//      are well-formed and parse-printable.
//   3. Slice-T aggregation types (Stats, Bucket, NumericAggregations,
//      Aggregations, <entity>Aggregations) are emitted; the per-entity agg
//      type is summarized with field count + first/last entries.

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

const wrappers = [
    'Node',
    `${entityName}Edge`,
    `${entityName}Connection`,
    entityName,
    'Root',
    'Stats',
    'Bucket',
    'NumericAggregations',
    'Aggregations',
    `${entityName}Aggregations`,
];
console.log('--- wrapper types emitted ---');
for (const t of wrappers) {
    const block = tryExtractTypeBlock(oursSdl, t);
    if (block) {
        if (t === `${entityName}Aggregations`) {
            const lines = block.split('\n');
            const fieldLines = lines.length - 2; // strip header + closing brace
            console.log(`\n${t}: ${fieldLines} fields  (first 5 + last 2 shown)`);
            const body = lines.slice(1, -1);
            for (const l of body.slice(0, 5)) console.log(l);
            if (body.length > 7) console.log('  ...');
            for (const l of body.slice(-2)) console.log(l);
        } else {
            console.log(`\n${block}`);
        }
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
