/**
 * This script is a helper that can be used to create
 * aliases for indices of a given release.
 *
 * Imagine that after a release (say, re_test_023) you have these indices:
 *  - study_centric_sd_preasa7s_re_test_023
 *  - biospecimen_centric_sd_1p41z782_re_test_023
 *  - participant_centric_sd_6fpyjqbr_re_test_023
 *  - file_centric_sd_ynssaphe_re_test_023
 *
 * Give as argument your release: for instance, "re_test_023"
 *
 *  npm run post-re-alias-helper -- release:re_test_023
 *
 * If the script ran successfully you should have the following aliases created (according to the example above):
 *  - next_study_centric
 *  - next_biospecimen_centric
 *  - next_participant_centric
 *  - next_file_centric
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
    process.exit(1)
}

const releaseIndices = catIndicesResponse.body.map(x => x.index);
assert(Array.isArray(releaseIndices) && releaseIndices.length > 0, 'No index found. Terminating');

const displayIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(`${releaseIndices.length} were found. Do you want to display them y/n? > `, answer => {
            if (answer === 'y') {
                console.log(releaseIndices);
            }
            resolve();
        });
    });
await displayIndicesQuestion();

const PREFIXES_TO_ALIAS = ['biospecimen_centric', 'participant_centric', 'study_centric', 'file_centric'];

const actions = releaseIndices.reduce((xs, x) => {
    const prefix = PREFIXES_TO_ALIAS.find(p => x.startsWith(p));
    if (!prefix) {
        // Must never happen
        return xs;
    }
    return [
        ...xs,
        {
            add: {
                index: x,
                alias: `next_${prefix}`,
            },
        },
    ];
}, []);
assert(actions.length === releaseIndices.length);

const displayActionQuestion = () =>
    new Promise(resolve => {
        userReadline.question('Do want to see the actions that are about to be sent to ES y/n? > ', answer => {
            console.log(answer);
            if (answer === 'y') {
                console.log(actions);
            }
            resolve();
        });
    });
await displayActionQuestion();

const displayProceedQuestion = () =>
    new Promise(resolve => {
        userReadline.question('Execute actions y/n? > ', answer => resolve(answer === 'y'));
    });

const mustExecuteActions = await displayProceedQuestion();
if (!mustExecuteActions) {
    userReadline.close();
    console.log('Terminating. No actions executed');
    process.exit(0);
}

userReadline.close();

const updateAliasesResponse = await client.indices.updateAliases({
    body: {
        actions,
    },
});
console.log(updateAliasesResponse.body);
