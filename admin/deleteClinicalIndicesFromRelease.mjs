//FIX: DUPLICATED CODE
/**
 *  npm run delete-clinical-indices-helper -- release:re_20231030_1
 *
 * */
import { Client } from '@elastic/elasticsearch';
import assert from 'node:assert/strict';
import readline from 'readline';

import { esHost } from '../dist/src/env.js';
import { cbKeepClinicalIndicesOnly } from './utils.mjs';

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

const INDEX_CLINICAL_CATEGORIES = ['file', 'participant', 'study', 'biospecimen', 'specimen_tree'];
const releaseClinicalIndices = catIndicesResponse.body
    .map(x => x.index)
    .filter(x => INDEX_CLINICAL_CATEGORIES.some(c => x.includes(c)))
    .sort();
assert(Array.isArray(releaseClinicalIndices) && releaseClinicalIndices.length > 0, 'No index found. Terminating');

// Extra check. Might not be needed, but cheap to test.
const hasOnlyClinicalIndices = releaseClinicalIndices.every(r => {
    const rawIndexPrefix = r.split('_')[0];
    const indexPrefix = rawIndexPrefix === 'specimen' ? 'specimen_tree' : rawIndexPrefix;
    return ['gene', 'variant'].some(prefix => !r.startsWith(prefix)) && INDEX_CLINICAL_CATEGORIES.includes(indexPrefix);
});
assert(
    hasOnlyClinicalIndices,
    `Oops it seems like non-clinical indices are included. Requires: ${INDEX_CLINICAL_CATEGORIES.join(
        ', ',
    )} only. Terminating`,
);

const rAllAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});

assert(rAllAliases.statusCode === 200);

const allAliases = rAllAliases.body;
const clinicalAliases = allAliases.filter(cbKeepClinicalIndicesOnly);

const isAliased = clinicalAliases.some(x => x.index.endsWith(releaseTag));
assert(!isAliased, `${releaseTag} is aliased`);

const displayIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(
            `${releaseClinicalIndices.length} were found. Do you want to display them y/n? > `,
            answer => {
                const yes = answer === 'y';
                if (yes) {
                    console.log(releaseClinicalIndices);
                }
                resolve();
            },
        );
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
            `Deleting ${releaseClinicalIndices.length} indices: ${releaseClinicalIndices
                .slice(0, maxDisplay)
                .join(', ')} ${releaseClinicalIndices.length > maxDisplay ? '...' : ''}`,
        );
    }
    const deleteResponse = await client.indices.delete({
        index: releaseClinicalIndices,
    });
    console.log(deleteResponse.body);
}

userReadline.close();
process.exit(0);
