//FIXE: DUPLICATED CODE
/**
 *  npm run post-re-delete-indices-helper -- release:re_20231030_1
 *
 * */
import assert from 'node:assert/strict';
import readline from 'readline';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const args = process.argv.slice(2);
const releaseArgument = args.find(a => a.startsWith('release:')) ?? '';
const releaseTag = releaseArgument.split(':')[1];
assert(!!releaseTag, 'You must instruct a release tag. For instance, "-- release:re_xyz"');

const userReadline = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const client = new Client({ node: esHost });

const catIndicesResponse = await client.cat.indices({
    index: `*_${releaseTag}`,
    h: 'index',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const releaseIndices = catIndicesResponse.body.map(x => x.index).sort();
assert(Array.isArray(releaseIndices) && releaseIndices.length > 0, 'No index found. Terminating');

const INDEX_CATEGORIES = ['file', 'participant', 'study', 'biospecimen'];
const hasAllTypeOfIndices = INDEX_CATEGORIES.every(wordStem => releaseIndices.some(x => x.includes(wordStem)));

assert(
    hasAllTypeOfIndices,
    `Oops it seems like there is at least one type missing. Requires: ${INDEX_CATEGORIES.join(', ')}. Terminating`,
);

const displayShowIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(`${releaseIndices.length} were found. Do you want to display them y/n? > `, answer => {
            const yes = answer === 'y';
            if (yes) {
                console.log(releaseIndices);
            }
            resolve();
        });
    });

await displayShowIndicesQuestion();
const displayIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(`Do you want to delete them y/n? > `, answer => {
            const yes = answer === 'y';
            resolve(yes);
        });
    });
const proceedToDeletion = await displayIndicesQuestion();
if (proceedToDeletion) {
    const deleteResponse = await client.indices.delete({
        index: releaseIndices,
    });
    console.log(deleteResponse.body);
}

userReadline.close();
process.exit(0);