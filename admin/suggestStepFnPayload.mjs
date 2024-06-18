import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import { cbKeepClinicalIndicesOnly } from './utils.mjs';
import assert from 'node:assert/strict';

const isInt = n => {
    return !isNaN(parseInt(n, 10)) && isFinite(n);
};

const formatNow = () => {
    //https://futurestud.io/tutorials/how-to-format-a-date-yyyy-mm-dd-in-javascript-or-node-js
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

const args = process.argv.slice(2);
const envArgument = args.find(x => x.startsWith('--env:')) ?? '';
const env = (envArgument.split('--env:')[1] || 'qa').toLowerCase();
assert(['qa', 'prd'].includes(env));

const client = new Client({ node: esHost });

const rArrProjects = await client.search({
    index: `arranger-projects`,
});

const allArrProjects = rArrProjects.body.hits.hits.map(x => x._id);

const project = allArrProjects.includes('include') ? 'include' : 'kf';
const isInclude = project === 'include';

const catIndicesResponse = await client.cat.indices({
    index: `*centric*`,
    h: 'index,creation.date,creation.date.string',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const clinicalIndices = catIndicesResponse.body.filter(cbKeepClinicalIndicesOnly);
assert(Array.isArray(clinicalIndices) && clinicalIndices.length > 0, 'No index found. Terminating');

const newReleaseWithoutAttempt = `re_${formatNow()}_`;

const todayIndices = clinicalIndices.filter(x => x.index.includes(newReleaseWithoutAttempt));

const attemptGuessed =
    todayIndices.length > 0
        ? Math.max(
              ...todayIndices
                  .map(x => x.index.split(newReleaseWithoutAttempt)[1].replace('_kf', ''))
                  .filter(x => isInt(x))
                  .map(x => parseInt(x, 10)),
          ) + 1
        : 1;

const rel = `${newReleaseWithoutAttempt}${attemptGuessed}`;

const allStudiesSearchResponse = await client.search({
    index: isInclude ? `*study_centric` : 'next_study_centric',
    body: {
        _source: ['study_id', 'study_code'],
        size: 1000,
    },
});

const allStudiesHits = (allStudiesSearchResponse?.body?.hits?.hits || []).sort();

const fhirUrls = {
    ['kf-qa']: 'https://kf-api-fhir-service-upgrade-qa.kf-strides.org',
    ['kf-prd']: 'https://kf-api-fhir-service-upgrade.kf-strides.org',
    ['inc-qa']: 'https://include-api-fhir-service-upgrade-qa.includedcc.org',
    ['inc-prd']: 'https://include-api-fhir-service-upgrade.includedcc.org',
};

if (project === 'include') {
    const payloadInc = {
        releaseId: rel,
        studyIds: allStudiesHits.filter(x => !x._index.includes('kf')).map(x => x._source.study_id),
        clusterSize: 'medium',
        portalEtlName: `clin-${env}-inc-${rel}`,
        fhirUrl: fhirUrls[`inc-${env}`],
        runGenomicEtl: false,
        verbose: 'false',
    };
    console.log(payloadInc);
    console.log('\n')
}

const addKfSuffixToRelIfInclude = () => `${rel}${isInclude ? '_kf' : ''}`;

const payloadKf = {
    releaseId: addKfSuffixToRelIfInclude(),
    studyIds: allStudiesHits.filter(x => (isInclude ? x._index.includes('kf') : x)).map(x => x._source.study_id),
    clusterSize: 'medium',
    portalEtlName: `clin-${env}-${isInclude ? 'inc-kf' : 'kf'}-${addKfSuffixToRelIfInclude()}`,
    fhirUrl: fhirUrls[`kf-${env}`],
    runGenomicEtl: false,
    verbose: 'false',
};
console.log(payloadKf);
