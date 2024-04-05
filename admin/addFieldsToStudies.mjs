// You must be connected to the correct ES HOST
// You can do:
//   docker run --rm -it -v ${PWD}:/app -u node --network=host --workdir /app node:20-alpine3.18 sh
//     node admin/addFieldsToStudies.mjs
import assert from 'node:assert/strict';
import EsInstance from '../dist/src/ElasticSearchClientInstance.js';
import readline from 'readline';

import { mockStudies, validateStudies } from './mockStudies.mjs';
const userReadline = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const yesOrNo = await new Promise(resolve => {
    userReadline.question(`This script is intend to be for INCLUDE. Do you want to proceed y/n? > `, answer =>
        resolve(answer === 'y'),
    );
});
userReadline.close();
if (!yesOrNo) {
    console.info('Terminating Script');
    process.exit(0);
}

const { keys, values } = Object;

const ms = [...mockStudies];

const vr = validateStudies(ms);
const invalidStudies = vr.filter(v => !v[1]);
if (invalidStudies.length > 0) {
    invalidStudies.forEach(v => {
        const [code, , errors] = v;
        console.log(`study=${code} is invalid`);
        console.log(errors);
    });
    process.exit(0);
}

const sCodes = [...new Set(ms.map(x => x.study_code))];
const nOfStudiesToEnhance = ms.length;
assert(sCodes.length === nOfStudiesToEnhance, 'Duplicated study_codes in mocks');

const client = await EsInstance.default.getInstance();

//Quick validation
const rM = await client.indices.getMapping({ index: 'study_centric' });
assert(rM.statusCode === 200);
const m = values(rM.body)[0]?.mappings?.properties;
assert(!!m);
//  !Notice Warning: mappings are multivalued (one for each study). Only the first found is used. So validation may, in certain instances, be incomplete,
const mappedKeys = ms.map(s => {
    const sTopLevelKeys = keys(s);
    const allKeysExistInMapping = sTopLevelKeys.every(sk => !!m[sk]);
    return [allKeysExistInMapping, sTopLevelKeys.filter(sk => !m[sk])];
});

const firstLevelNestedOK = ['dataset', 'data_types', 'contacts', 'experimental_strategies'].every(k => m[k]?.type === 'nested');
const mappingSeemsValid = firstLevelNestedOK && mappedKeys.every(x => !!x[0]);
if (!mappingSeemsValid) {
    console.error('It seems like not all values are mapped correctly.');
    if (m.dataset.type === 'nested') {
        console.error('Problematic keys: ', [
            ...new Set(
                mappedKeys
                    .filter(x => !x[0])
                    .map(x => x[1])
                    .flat(),
            ),
        ]);
    }
    process.exit(0);
}

// Processing
const r = await client.search({
    index: 'study_centric',
    size: sCodes.length,
    body: {
        query: {
            bool: {
                must: [
                    {
                        terms: {
                            study_code: sCodes,
                        },
                    },
                ],
            },
        },
    },
});
assert(r.statusCode === 200);
const hits = r.body.hits;
assert(
    hits.total.value <= nOfStudiesToEnhance &&
        hits?.hits &&
        hits.hits.every(h => sCodes.includes(h._source.study_code)),
);

const operations = ms
    .flatMap(doc => {
        const oDoc = hits.hits.find(h => h._source.study_code === doc.study_code);
        if (!oDoc) {
            return undefined;
        }
        return [
            { update: { _index: oDoc._index, _id: oDoc._id } },
            {
                doc: {
                    ...oDoc._source,
                    ...doc,
                },
            },
        ];
    })
    .filter(x => !!x);

assert(operations.length >= 1);
const br = await client.bulk({ refresh: true, body: operations });
assert(br.statusCode === 200 || !br.body?.errors, br);

// Post-validation
const uItems = br.body.items;
// Not a perfect check theoretically, but it should be largely sufficient.
// Besides, identity ( f(x)=x ) transform is considered as an update
const allUpdated = uItems.length === ms.length;
const updatedDocsIds = uItems.map(x => x.update._id)
const updatedCodes = updatedDocsIds.reduce((xs, x) => {
    const code = hits.hits.find(h => h._id === x)?._source.study_code;
    return code ? [...xs, code] : xs
}, [])
console.log('Codes updated');
console.log(updatedCodes);
const notUpdatedCodes = sCodes.filter(c => !updatedCodes.includes(c))
if (notUpdatedCodes.length > 0) {
    console.log('Codes NOT updated (no studies found with these codes in study_centric)');
    console.log(notUpdatedCodes);
}
console.log(
    allUpdated
        ? 'All items were updated'
        : `Updated ${br.body.items.length} docs (ids=${uItems
              .map(item => item.update._id)
              .sort()
              .join(',')})`,
);

process.exit(0);
