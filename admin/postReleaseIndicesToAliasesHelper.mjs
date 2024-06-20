/**
 * This script is a helper that can be used to create
 * aliases for indices of a given release.
 *
 *  npm run post-re-alias-helper -- release:re_test_023 action:remove
 *
 *   npm run post-re-alias-helper -- release:re_test_023 action:remove test
 *
 * */
import assert from 'node:assert/strict';
import readline from 'readline';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import { cbKeepClinicalIndicesOnly } from './utils.mjs';

const args = process.argv.slice(2);
const releaseArgument = args.find(a => a.startsWith('release:')) ?? '';
const releaseTag = releaseArgument.split(':')[1];
assert(!!releaseTag, 'You must instruct a release tag. For instance, "-- release:re_xyz"');

const aliasActionArgument = args.find(a => a.startsWith('action:')) ?? '';
const ALIAS_ACTIONS = {
    add: 'add',
    remove: 'remove',
};
const aliasAction = aliasActionArgument.split(':')?.[1]?.toLocaleLowerCase() ?? ALIAS_ACTIONS.add;
assert(
    Object.values(ALIAS_ACTIONS).includes(aliasAction),
    `Alias actions must be one of: "${Object.values(ALIAS_ACTIONS).join(', ')}". For instance, "-- action:${
        ALIAS_ACTIONS.remove
    }"`,
);

const testArgument = args.find(a => a.startsWith('test')) ?? '';
const isTest = !!testArgument;

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

const releaseIndices = catIndicesResponse.body
    .filter(cbKeepClinicalIndicesOnly)
    .map(x => x.index)
    .sort();
assert(Array.isArray(releaseIndices) && releaseIndices.length > 0, 'No index found. Terminating');

const displayIndicesQuestion = () =>
    new Promise(resolve => {
        userReadline.question(
            `${releaseIndices.length} were found. Do you want to display its counts per entity y/n? > `,
            answer => {
                if (answer === 'y') {
                    const entityToStudies = releaseIndices.reduce((xs, x) => {
                        const [entity, studyIdWithRelease] = x.split('_centric_');
                        const studyId = studyIdWithRelease.split('_re')[0];
                        return {
                            ...xs,
                            [entity]: xs[entity] ? [...xs[entity], studyId] : [studyId],
                        };
                    }, {});
                    const entityCounts = Object.entries(entityToStudies).map(([k, v]) => ({
                        entity: k,
                        study_counts: v.length,
                    }));
                    console.table(entityCounts);
                }
                resolve();
            },
        );
    });
await displayIndicesQuestion();

const INDICES_PREFIXES = ['biospecimen_centric', 'participant_centric', 'study_centric', 'file_centric'];

const allAliases = await client.cat.aliases({
    h: 'alias',
    format: 'json',
});

//At this point, KF next uses the prefix next.
const isNextFormat = allAliases.body
    .map(x => x.alias)
    .some(
        x =>
            x.startsWith('next_study_centric') ||
            x.startsWith('next_participant_centric') ||
            x.startsWith('next_biospecimen_centric') ||
            x.startsWith('next_variant_centric') ||
            x.startsWith('next_gene_centric') ||
            x.startsWith('next_file_centric'),
    );

const actions = releaseIndices.reduce((xs, x) => {
    const prefix = INDICES_PREFIXES.find(p => x.startsWith(p));
    if (!prefix) {
        // Must never happen
        return xs;
    }
    const alias = isNextFormat ? `next_${prefix}` : prefix;
    return [
        ...xs,
        {
            [aliasAction]: {
                index: x,
                alias: isTest ? `${alias}_test` : alias,
            },
        },
    ];
}, []);
assert(actions.length === releaseIndices.length);

const allIndexTargetsCorrectAlias = actions.every(a => {
    const index = a[aliasAction].index;
    const alias = a[aliasAction].alias;
    return index.startsWith(alias.replace('next_', ''));
});
assert(allIndexTargetsCorrectAlias);

const displayActionQuestion = () =>
    new Promise(resolve => {
        userReadline.question('Do want to see an actions sample that are about to be sent to ES y/n? > ', answer => {
            console.log(answer);
            if (answer === 'y') {
                INDICES_PREFIXES.forEach(x => {
                    console.log(
                        x,
                        '=> ',
                        [...actions].find(a => a[aliasAction].index.includes(x)),
                    );
                });
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
