//FIX: DUPLICATED CODE
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
assert(!!releaseTag, 'You must instruct a release tag. For instance, "-- release:re_xyz --interactive"');
const isInteractive = args.some(a => a === '--interactive');

const userReadline = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const displayDoYouWantToProceed = () =>
    new Promise(resolve => {
        userReadline.question(`You are about to delete indices. Do you want to proceed y/n? > `, answer =>
            resolve(answer === 'y'),
        );
    });

const wannaProceed = await displayDoYouWantToProceed();

if (!wannaProceed) {
    process.exit(0);
}

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
const hasOnlyClinicalIndices = releaseIndices.every(r => {
    const indexPrefix = r.split('_')[0];
    return INDEX_CATEGORIES.includes(indexPrefix);
});

assert(
    hasOnlyClinicalIndices,
    `Oops it seems like there is at least one type missing. Requires: ${INDEX_CATEGORIES.join(', ')}. Terminating`,
);

const displayIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(`${releaseIndices.length} were found. Do you want to display them y/n? > `, answer => {
            const yes = answer === 'y';
            if (yes) {
                console.log(releaseIndices);
            }
            resolve();
        });
    });

isInteractive && (await displayIndicesQuestion());

const displayIndicesQuestionAfterShowThem = () =>
    new Promise(resolve => {
        userReadline.question(`Do you want to delete them y/n? > `, answer => {
            const isYes = answer === 'y';
            resolve(isYes);
        });
    });
const proceedToDeletion = isInteractive ? await displayIndicesQuestionAfterShowThem() : true;
if (proceedToDeletion) {
    if (!isInteractive) {
        const maxDisplay = 5;
        console.log(
            `Deleting ${releaseIndices.length} indices: ${releaseIndices.slice(0, maxDisplay).join(', ')} ${
                releaseIndices.length > maxDisplay ? '...' : ''
            }`,
        );
    }
    const deleteResponse = await client.indices.delete({
        index: releaseIndices,
    });
    console.log(deleteResponse.body);
}

userReadline.close();
process.exit(0);
