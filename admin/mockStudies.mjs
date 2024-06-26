import Ajv from 'ajv';

export const mockStudies = [
    {
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
        dataset: [
            {
                dataset_id: 'HTP-TR',
                external_dataset_id: '',
                dataset_name: 'HTP Whole Blood RNAseq (v1)',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Transcriptomics',
                data_types: ['Normalized relative expression (FPKM)'],
                expected_number_participants: 400,
                experimental_strategy: 'Bulk polyA+ RNAseq',
                experimental_platform: 'Illumina Novaseq',
                is_harmonized: true,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: '',
                repository: 'Gene Expression Omnibus',
                repository_url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE190125',
                participant_count: 402,
                biospecimen_count: 402,
                file_count: 3200,
            },
            {
                dataset_id: 'HTP-MET',
                external_dataset_id: '',
                dataset_name: 'HTP Plasma Metabolomics (v1)',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Metabolomics',
                data_types: ['Preprocessed metabolite relative abundance'],
                expected_number_participants: 418,
                experimental_strategy: 'LCMS Metabolomics',
                experimental_platform: 'Ultra high-performance liquid chromatography-mass spectrometry (UHPLC-MS)',
                is_harmonized: false,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002981',
                repository: 'Metabolomics Workbench',
                repository_url:
                    'http://dev.metabolomicsworkbench.org:22222/data/DRCCMetadata.php?Mode=Study&StudyID=ST002200&Access=UrlT3545',
                participant_count: 418,
                biospecimen_count: 3743,
                file_count: 477,
            },
            {
                dataset_id: 'HTP-UNHAR',
                external_dataset_id: '',
                dataset_name: 'HTP Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '2016',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_number_participants: 1055,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: '',
                repository: '',
                repository_url: '',
                participant_count: 1055,
                biospecimen_count: 0,
                file_count: 1,
            },
            {
                dataset_id: 'HTP-PRO',
                external_dataset_id: '',
                dataset_name: 'HTP Plasma Inflammatory Markers (MSD v1)',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Proteomics',
                data_types: ['Protein abundance (absolute protein concentration)'],
                expected_number_participants: 477,
                experimental_strategy: 'Multiplex immunoassay',
                experimental_platform: 'Meso Scale Discovery Assays (MSD)',
                is_harmonized: false,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: '',
                repository: 'Synapse',
                repository_url: 'https://www.synapse.org/#!Synapse:syn31475487',
                participant_count: 479,
                biospecimen_count: 4371,
                file_count: 477,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '2016',
        experimental_strategies: [
            {
                file_count: 3200,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 880,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 447,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 418,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs002330', 'phs002981'],
        institutions: ['Linda Crnic Institute for Down Syndrome'],
        investigator_names: ['Joaquin M. Espinosa'],
        is_harmonized: true,
        study_code: 'HTP',
    },
    {
        controlled_access: ['Registered', 'Controlled'],
        data_category: ['Genomics', 'Clinical'],
        dataset: [
            {
                dataset_id: 'DS-COG-ALL-GEN',
                external_dataset_id: '',
                dataset_name: 'DS-COG-ALL Whole Genome Sequencing',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Genomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 530,
                experimental_strategy: 'Whole Genome Sequencing',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002330',
                repository: '',
                repository_url: '',
                participant_count: 530,
                biospecimen_count: 834,
                file_count: 7211,
            },
            {
                dataset_id: 'DS-COG-ALL-UNHAR',
                external_dataset_id: '',
                dataset_name: 'DS-COG-ALL Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 530,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002330',
                repository: '',
                repository_url: '',
                participant_count: 530,
                biospecimen_count: 0,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 7211,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs002330'],
        institutions: ['Baylor College Of Medicine'],
        investigator_names: ['Phillip J. Lupo'],
        is_harmonized: true,
        study_code: 'DS-COG-ALL',
    },
    {
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        dataset: [
            {
                dataset_id: 'DS360-CHD-GEN',
                external_dataset_id: '',
                dataset_name: 'DS360-CHD Whole Genome Sequencing',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Genomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 1327,
                experimental_strategy: 'Whole Genome Sequencing',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: ['not for profit organisation use only (DUO:0000045)'],
                dbgap: 'phs002330',
                repository: '',
                repository_url: '',
                participant_count: 1327,
                biospecimen_count: 1344,
                file_count: 4922,
            },
            {
                dataset_id: 'DS360-CHD-UNHAR',
                external_dataset_id: '',
                dataset_name: 'DS360-CHD Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 1327,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: ['not for profit organisation use only (DUO:0000045)'],
                dbgap: 'phs002330',
                repository: '',
                repository_url: '',
                participant_count: 1327,
                biospecimen_count: 0,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 3769,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs002330'],
        institutions: ['Emory University School of Medicine'],
        investigator_names: ['Stephanie Sherman'],
        is_harmonized: true,
        study_code: 'DS360-CHD',
    },
    {
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        dataset: [
            {
                dataset_id: 'DS-PCGC-GEN',
                external_dataset_id: '',
                dataset_name: 'DS-PCGC Whole Genome Sequencing',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Genomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 369,
                experimental_strategy: 'Whole Genome Sequencing',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['health or medical or biomedical research (DUO:0000006)'],
                access_requirements: ['not for profit organisation use only (DUO:0000045)'],
                dbgap: 'phs001138',
                repository: '',
                repository_url: '',
                participant_count: 369,
                biospecimen_count: 369,
                file_count: 818,
            },
            {
                dataset_id: 'DS-PCGC-UNHAR',
                external_dataset_id: '',
                dataset_name: 'DS-PCGC Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 369,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: ['health or medical or biomedical research (DUO:0000006)'],
                access_requirements: ['not for profit organisation use only (DUO:0000045)'],
                dbgap: 'phs001138',
                repository: '',
                repository_url: '',
                participant_count: 369,
                biospecimen_count: 0,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 818,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs001138', 'phs002330'],
        institutions: ["Cincinnati Children's Hospital Medical Center"],
        investigator_names: ['Eileen C. King'],
        is_harmonized: true,
        study_code: 'DS-PCGC',
    },
    {
        controlled_access: ['Registered'],
        data_category: ['Genomics', 'Transcriptomics', 'Imaging', 'Clinical'],
        dataset: [
            {
                dataset_id: 'X01-Hakon-GEN',
                external_dataset_id: '',
                dataset_name: 'X01-Hakonarson Whole Genome Sequencing',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Genomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 1134,
                experimental_strategy: 'Whole Genome Sequencing',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002983',
                repository: '',
                repository_url: '',
                participant_count: 1152,
                biospecimen_count: 1908,
                file_count: 2565,
            },
            {
                dataset_id: 'X01-Hakon-RNASeq',
                external_dataset_id: '',
                dataset_name: 'X01-Hakonarson RNASeq',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Transcriptomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 1152,
                experimental_strategy: 'Bulk RNA-Seq',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002983',
                repository: '',
                repository_url: '',
                participant_count: 1152,
                biospecimen_count: 1908,
                file_count: 2565,
            },
            {
                dataset_id: 'X01-Hakon-UNHAR',
                external_dataset_id: '',
                dataset_name: 'X01-Hakonarson Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 1152,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002983',
                repository: '',
                repository_url: '',
                participant_count: 369,
                biospecimen_count: 0,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 2565,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs002983'],
        institutions: ["Children's Hospital of Philadelphia"],
        investigator_names: ['Hakon Hakonarson'],
        is_harmonized: true,
        study_code: 'X01-Hakonarson',
    },
    {
        controlled_access: ['Registered'],
        data_category: ['Clinical'],
        dataset: [
            {
                dataset_id: 'X01-deSmith-GEN',
                external_dataset_id: '',
                dataset_name: 'X01-deSmith Whole Genome Sequencing',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Genomics',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 436,
                experimental_strategy: 'Whole Genome Sequencing',
                experimental_platform: 'Illumina',
                is_harmonized: true,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002982',
                repository: '',
                repository_url: '',
                participant_count: 436,
                biospecimen_count: 436,
                file_count: 0,
            },
            {
                dataset_id: 'X01-deSmith-UNHAR',
                external_dataset_id: '',
                dataset_name: 'X01-deSmith Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: [],
                expected_data_categories: [],
                expected_number_participants: 436,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002982',
                repository: '',
                repository_url: '',
                participant_count: 436,
                biospecimen_count: 436,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: ['phs002982'],
        institutions: ['University of Oxford'],
        investigator_names: ['Adam de Smith'],
        is_harmonized: true,
        study_code: 'X01-deSmith',
    },
    {
        controlled_access: ['Registered'],
        data_category: ['Transcriptomics', 'Clinical'],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '2018',
        experimental_strategies: [
            {
                file_count: 253,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: [],
        institutions: ['Benaroya Research Institute'],
        investigator_names: ['Jane Buckner'],
        is_harmonized: true,
        study_code: 'BRI-DSR',
    },
    {
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 123,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: [],
        institutions: ['Linda Crnic Institute for Down Syndrome'],
        investigator_names: ['Joaquin Espinosa'],
        is_harmonized: true,
        study_code: 'DS-NEXUS',
    },
    {
        controlled_access: [],
        data_category: ['Clinical'],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: [],
        institutions: ['Geisinger Health System'],
        investigator_names: ['Christa Martin'],
        is_harmonized: true,
        study_code: 'DS-Sleep',
    },
    {
        controlled_access: [],
        data_category: ['Clinical'],
        dataset: [
            {
                dataset_id: 'DS-Connect-UNHAR',
                external_dataset_id: '',
                dataset_name: 'DS-Connect Unharmonized Demographic/Clinical Data',
                date_collection_start_year: '2013',
                date_collection_end_year: '',
                data_category: 'Unharmonized Demographic/Clinical Data',
                data_types: ['Social Determinants of Health', 'Demographics', 'Co-occurring Conditions'],
                expected_data_categories: ['Unharmonized Demographic/Clinical Data'],
                expected_number_participants: 3634,
                experimental_strategy: '',
                experimental_platform: '',
                is_harmonized: false,
                publications: [],
                access_limitations: [],
                access_requirements: [],
                dbgap: '',
                repository: '',
                repository_url: '',
                participant_count: 3484,
                biospecimen_count: 0,
                file_count: 1,
            },
        ],
        date_collection_end_year: '',
        date_collection_start_year: '2013',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: [],
        institutions: ['Eunice Kennedy Shriver National Institute of Child Health and Human Development'],
        investigator_names: ['Sujata Bardhan'],
        is_harmonized: true,
        study_code: 'DSC',
    },
    {
        controlled_access: [],
        data_category: ['Clinical'],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        experimental_strategies: [
            {
                file_count: 0,
                experimental_strategy: 'RNA-Seq',
            },
            {
                file_count: 0,
                experimental_strategy: 'Whole Genome Sequencing',
            },
            {
                file_count: 0,
                experimental_strategy: 'Multiplex Immunoassay',
            },
            {
                file_count: 0,
                experimental_strategy: 'LCMS Metabolomics',
            },
        ],
        external_ids: [],
        institutions: ['University of Pittsburgh'],
        investigator_names: ['Bradley T. Christian', 'Benjamin L. Handen', 'Elizabeth Head', 'Mark Mapstone'],
        is_harmonized: true,
        study_code: 'ABC-DS',
    },
];

const sSchema = {
    title: 'Study',
    type: 'object',
    properties: {
        controlled_access: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        data_category: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        dataset: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    dbgap: {
                        type: 'string',
                    },
                    dataset_id: {
                        type: 'string',
                    },
                    external_dataset_id: {
                        type: 'string',
                    },
                    dataset_name: {
                        type: 'string',
                    },
                    date_collection_start_year: {
                        type: 'string',
                    },
                    date_collection_end_year: {
                        type: 'string',
                    },
                    data_category: {
                        type: 'string',
                    },
                    data_types: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    expected_number_participants: {
                        type: 'integer',
                    },
                    experimental_strategy: {
                        type: 'string',
                    },
                    experimental_platform: {
                        type: 'string',
                    },
                    publications: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    access_limitations: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    access_requirements: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    repository: {
                        type: 'string',
                    },
                    repository_url: {
                        type: 'string',
                    },
                    participant_count: {
                        type: 'integer',
                    },
                    biospecimen_count: {
                        type: 'integer',
                    },
                    file_count: {
                        type: 'integer',
                    },
                    is_harmonized: {
                        type: 'boolean',
                    },
                },
            },
        },
        date_collection_end_year: {
            type: 'string',
        },
        date_collection_start_year: {
            type: 'string',
        },
        experimental_strategies: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    file_count: {
                        type: 'integer',
                    },
                    experimental_strategy: {
                        type: 'string',
                    },
                },
            },
        },
        external_ids: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        institutions: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        is_harmonized: {
            type: 'boolean',
        },
        investigator_names: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        study_code: {
            type: 'string',
        },
    },
    required: ['study_code'],
};

export const validateStudies = sData => {
    const ajv = new Ajv();
    const validate = ajv.compile(sSchema);
    return sData.map(s => {
        const valid = validate(s);
        return [s.study_code, valid, validate.errors];
    });
};
