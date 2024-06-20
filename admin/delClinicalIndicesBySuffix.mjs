//FIX: DUPLICATED CODE
/**
 *  node ... delClinicalIndicesBySuffix.mjs -- suffix:xyz
 *
 * */
import assert from 'node:assert/strict';
import readline from 'readline';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import { cbKeepClinicalIndicesOnly } from './utils.mjs';

const args = process.argv.slice(2);
const rawSuffix = args.find(a => a.startsWith('suffix:')) ?? '';
const suffix = (rawSuffix.split(':')[1] || '').trim();
assert(!!suffix, 'You must instruct the suffix of an index name. For instance, "suffix:sd_bhjxbdqk_20240611_1"');

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
    userReadline.close();
    process.exit(0);
}

const client = new Client({ node: esHost });

const catIndicesResponse = await client.cat.indices({
    index: `*${suffix}`,
    h: 'index',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const clinicalIndices = catIndicesResponse.body.filter(cbKeepClinicalIndicesOnly).map(x => x.index);
assert(Array.isArray(clinicalIndices) && clinicalIndices.length > 0, 'No index found. Terminating');

const rAllAliases = await client.cat.aliases({
    h: 'alias,index',
    format: 'json',
});
assert(rAllAliases.statusCode === 200);

const allAliases = rAllAliases.body;
const clinicalAliases = allAliases.filter(cbKeepClinicalIndicesOnly);

const displayDoYouWantToDeleteIndices = () =>
    new Promise(resolve => {
        console.log('found', clinicalIndices.length, 'indices.');
        console.log(
            JSON.stringify(
                clinicalIndices.sort().map(x => {
                    return clinicalAliases.some(a => a.index === x) ? ['Aliased', x] : x;
                }),
                null,
                2,
            ),
        );
        userReadline.question(`Do you want to delete those indices y/n? > `, answer => resolve(answer === 'y'));
    });

const okDelete = await displayDoYouWantToDeleteIndices();
if (okDelete) {
    const deleteResponse = await client.indices.delete({
        index: clinicalIndices,
    });
    console.log(deleteResponse.body);
}
userReadline.close();
