// You must be connected to the correct ES HOST
// You can do:
//   docker run --rm -it -v ${PWD}:/app -u node --network=host --workdir /app node:20-alpine3.18 sh
//     node admin/addMockDataToHTP.mjs
import assert from 'node:assert/strict';
import EsInstance from '../dist/src/ElasticSearchClientInstance.js';
import readline from 'readline';

const userReadline = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const displayDoYouWantToProceed = () =>
    new Promise(resolve => {
        userReadline.question(`This script is intend to be for INCLUDE. Do you want to proceed y/n? > `, answer =>
            resolve(answer === 'y'),
        );
    });

const wannaProceed = await displayDoYouWantToProceed();
userReadline.close();
if (!wannaProceed) {
    console.info('Terminating Script');
    process.exit(0);
}

const client = await EsInstance.default.getInstance();

const STUDY_CODE_HTP = 'HTP';
const TARGET_INDEX = 'study_centric';

const r = await client.search({
    index: TARGET_INDEX,
    body: {
        query: {
            bool: {
                must: [
                    {
                        term: {
                            study_code: {
                                value: STUDY_CODE_HTP,
                            },
                        },
                    },
                ],
            },
        },
    },
});
assert(r.statusCode === 200);

const hits = r.body.hits;
assert(hits.total.value === 1, 'There must be only one study candidate');

const originalStudy = hits.hits[0];
const mock = {
    biorepo_email: 'dsresearch@cuanschutz.edu',
    biorepo_url: 'https://redcap.link/HTPVBRrequest',
    biospecimen_count: '39430',
    contact_email: 'dsresearch@cuanschutz.edu',
    contact_name: 'Angela Rachubinski',
    controlled_access: ['Registered', 'Controlled'],
    data_category: [
        'Genomics',
        'Transcriptomics',
        'Proteomics',
        'Metabolomics',
        'Cognitive',
        'Immune maps',
        'Microbiome',
        'Imaging',
        'Clinical',
    ],
    data_source: [
        'Investigator assessment (examination, interview, etc.)',
        'Medical record',
        'Patient or caregiver report (survey, questionnaire, etc.)',
    ],
    dataset: [
        {
            dataset_id: 'TR-HTP',
            external_dataset_id: '',
            dataset_name: 'HTP Whole Blood RNAseq ',
            date_collection_start_year: '2016',
            date_collection_end_year: '2020',
            data_category: 'Transcriptomics',
            data_type: 'Normalized relative expression (FPKM)',
            experimental_strategy: 'Bulk polyA+ RNAseq',
            experimental_platform: 'Illumina Novaseq',
            publication: ['PMID: 37379383'],
            access_limitation: 'General research use (DUO:0000042)',
            access_requirement: 'Not for profit, non commercial use only (DUO:0000018)',
            dbgap: 'phs002981',
            repository: 'Gene Expression Omnibus',
            repository_url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE190125',
            participant_count: '402',
            biospecimen_count: '402',
        },
        {
            dataset_id: 'PRO-HTP',
            external_dataset_id: '',
            dataset_name: 'HTP Plasma Inflammatory Markers',
            date_collection_start_year: '2016',
            date_collection_end_year: '2020',
            data_category: 'Proteomics',
            data_type: 'Protein abundance (absolute protein concentration)',
            experimental_strategy: 'Multiplex immunoassay',
            experimental_platform: 'Meso Scale Discovery Assays (MSD)',
            publication: ['PMID: 37379383', 'PMID: 36577365'],
            access_limitation: 'General research use (DUO:0000042)',
            access_requirement: 'Not for profit, non commercial use only (DUO:0000018)',
            dbgap: '',
            repository: 'Synapse',
            repository_url: 'https://doi.org/10.7303/syn31475487',
            participant_count: '402',
            biospecimen_count: '402',
            file_count: '4975',
        },
    ],
    date_collection_end_year: '2020',
    date_collection_start_year: '2016',
    description:
        'The Human Trisome Project (HTP) is a large and comprehensive natural history study of Down syndrome involving collection of deep clinical data, multimodal phenotyping, a multi-dimensional biobank, generation of pan-omics datasets, and rapid release of data. The HTP has enabled many discoveries about the pathophysiology of Down syndrome, leading to new clinical trials testing  therapies to improve diverse health outcomes in this population.',
    domain: 'All co-occurring conditions (D013568)',
    external_id: 'phs001138',
    file_count: '4975',
    institution: 'Linda Crnic Institute for Down Syndrome',
    investigator_name: 'Joaquin M. Espinosa',
    part_lifespan_stage: ['Pediatric', 'Adult'],
    participant_count: '1062',
    program: 'INCLUDE',
    publication: [
        'PMID: 37379383',
        'PMID: 37360690',
        'PMID: 37277650',
        'PMID: 36577365',
        'PMID: 33787858',
        'PMID: 31722205',
        'PMID: 31699819',
        'PMID: 31628327',
        'PMID: 29296929',
        'PMID: 29093484',
        'PMID: 27472900',
    ],
    selection_criteria: 'Ages 6 months to 89 years old, with or without Down syndrome',
    study_code: STUDY_CODE_HTP,
    study_design: ['Case-control', 'Longitudinal'],
    study_name: 'The Human Trisome Project',
    website: 'www.trisome.org',
};

const rM = await client.indices.getMapping({ index: originalStudy._index });
assert(rM.statusCode === 200);
const m = Object.values(rM.body)[0]?.mappings?.properties;
assert(!!m);
const mKeys = Object.keys(m);
//if common fields, original wins -- no override of original values.
const newDoc = {
    ...mock,
    ...originalStudy._source,
};
assert(Object.keys(newDoc).length <= mKeys.length);

const mappingValidation = Object.entries(newDoc).reduce((xs, [k]) => {
    const fieldExistsInMapping = mKeys.includes(k);
    if (fieldExistsInMapping) {
        const allowedTypes = ['dataset'].includes(k)
            ? ['nested']
            : ['keyword', 'long', 'boolean', 'float'];
        return [...xs, { field: k, mappingOK: allowedTypes.includes(m[k].type), probableCause: 'Incorrect Type' }];
    }
    return [...xs, { field: k, mappingOK: false, probableCause: 'Missing from mapping' }];
}, []);

const errors = mappingValidation.filter(x => !x.mappingOK);
if (errors.length > 0) {
    console.warn(`${String.fromCodePoint(0x26a0)} There are issues with the mapping.`);
    console.table(
        errors
            //https://www.javascripttutorial.net/array/javascript-sort-an-array-of-objects/
            .sort((a, b) => {
                const fa = a.field;
                const fb = b.field;
                if (fa < fb) {
                    return -1;
                }
                if (fa > fb) {
                    return 1;
                }
                return 0;
            })
            .map(({ mappingOK, ...props }) => ({ ...props })),
    );
    console.warn('Terminating Script');
    process.exit(0);
}

const ru = await client.update({
    index: TARGET_INDEX,
    id: originalStudy._id,
    body: {
        doc: {
            ...newDoc,
        },
    },
});

assert(ru.statusCode === 200 && ['updated', 'noop'].includes(ru.body?.result));
console.info(ru.body?.result);

process.exit(0);
