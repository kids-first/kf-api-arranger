import Ajv from 'ajv';
export const mockStudies = [
    {
        biorepo_email: 'dsresearch@cuanschutz.edu',
        biorepo_url: 'https://redcap.link/HTPVBRrequest',
        biospecimen_count: 39430,
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
                dataset_name: 'HTP Whole Blood RNAseq ',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Transcriptomics',
                data_type: 'Normalized relative expression (FPKM)',
                expected_data_categories: ['Transcriptomics'],
                experimental_strategy: 'Bulk polyA+ RNAseq',
                experimental_platform: 'Illumina Novaseq',
                publication: ['PMID: 37379383'],
                access_limitation: 'General research use (DUO:0000042)',
                access_requirement: 'Not for profit, non commercial use only (DUO:0000018)',
                repository: 'Gene Expression Omnibus',
                repository_url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE190125',
                participant_count: 402,
                biospecimen_count: 402,
                file_count: 3200,
            },
            {
                dataset_id: 'MET-HTP',
                dataset_name: 'HTP Plasma Metabolomics',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Metabolomics',
                data_type: 'Preprocessed metabolite relative abundance',
                expected_data_categories: ['Metabolomics'],
                experimental_strategy: 'Mass spec metabolomics',
                experimental_platform: 'UHPLC-MS',
                publication: ['PMID: 37379383'],
                access_limitation: 'General research use (DUO:0000042)',
                access_requirement: 'Not for profit, non commercial use only (DUO:0000018)',
                dbgap: 'phs002981',
                participant_count: 479,
                biospecimen_count: 479,
                file_count: 477,
            },
            {
                dataset_id: 'PRO-HTP',
                dataset_name: 'HTP Plasma Inflammatory Markers',
                date_collection_start_year: '2016',
                date_collection_end_year: '2020',
                data_category: 'Proteomics',
                data_type: 'Protein abundance (absolute protein concentration)',
                expected_data_categories: ['Proteomics'],
                experimental_strategy: 'Multiplex immunoassay',
                experimental_platform: 'Meso Scale Discovery Assays (MSD)',
                publication: ['PMID: 37379383'],
                access_limitation: 'General research use (DUO:0000042)',
                access_requirement: 'Not for profit, non commercial use only (DUO:0000018)',
                participant_count: 479,
                biospecimen_count: 479,
                file_count: 477,
            },
        ],
        date_collection_end_year: '2020',
        date_collection_start_year: '2016',
        description:
            'The Human Trisome Project (HTP) is a large and comprehensive natural history study of Down syndrome involving collection of deep clinical data, multimodal phenotyping, a multi-dimensional biobank, generation of pan-omics datasets, and rapid release of data. The HTP has enabled many discoveries about the pathophysiology of Down syndrome, leading to new clinical trials testing  therapies to improve diverse health outcomes in this population.',
        domain: 'All co-occurring conditions (D013568))',
        expected_data_categories: [
            'Genomics',
            'Demographic',
            'Transcriptomics',
            'Proteomics',
            'Metabolomics',
            'Immune maps',
            'Microbiome',
            'Imaging',
            'Clinical',
        ],
        expected_number_participants: 2500,
        external_id: 'phs001138',
        file_count: 4975,
        institution: 'Linda Crnic Institute for Down Syndrome',
        investigator_name: 'Joaquin M. Espinosa',
        part_lifespan_stage: ['Pediatric (birth-17 years)', 'Adult (18+ years)'],
        participant_count: 1062,
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
        study_code: 'HTP',
        study_design: ['Case-control', 'Longitudinal'],
        study_name: 'The Human Trisome Project',
        website: 'www.trisome.org',
    },
    {
        biospecimen_count: 834,
        contact_email: 'philip.lupo@bcm.edu',
        contact_name: 'Phillip J Lupo',
        controlled_access: ['Registered', 'Controlled'],
        data_category: ['Genomics', 'Clinical'],
        dataset: [
            {
                dataset_id: 'GEN-DS-COG-ALL',
                dataset_name: 'DS-COG-ALL Whole genome sequencing',
                data_category: 'Genomics',
                expected_data_category: 'Genomics',
                expected_number_participants: 530,
                experimental_strategy: 'Whole genome sequencing',
                experimental_platform: 'Illumina',
                access_limitation: 'General research use (DUO:0000042)',
                dbgap: 'phs002330',
                participant_count: 530,
                biospecimen_count: 834,
                file_count: 7211,
            },
            {
                dataset_id: 'CLIN-DS-COG-ALL',
                dataset_name: 'DS-COG-ALL Clinical',
                data_category: 'Clinical',
                expected_data_category: 'Unharmonized demographic/clinical data',
                expected_number_participants: 530,
                access_limitation: 'General research use (DUO:0000042)',
                dbgap: 'phs002330',
                participant_count: 530,
            },
        ],
        description:
            "This study is a collaboration with the trans-NIH nNvestigation of Co-occurring conditions across the Lifespan to Understand Down syndrome (INCLUDE) Project, which seeks to improve health and quality-of-life for individuals with Down syndrome, and NHLBI's TransOmics for Precision Medicine (TOPMed) program, which seeks to apply omics technologies to improve scientific understanding of the fundamental biological processes that underlie heart, lung, blood, and sleep (HLBS) disorders. Additional Pediatric Cardiac Genetics Consortium (PCGC) data from children affected with Down syndrome and congenital heart disease are accessible through two separate dbGaP studies: phs001138 (Kids First) and phs001194 (TOPMed).",
        domain: 'Hematologic Diseases (D006402)',
        expected_data_categories: ['Unharmonized demographic/clinical data', 'Genomics'],
        expected_number_participants: 530,
        external_id: 'phs002330',
        file_count: 7211,
        institution: 'Baylor College Of Medicine',
        investigator_name: 'Phillip J Lupo',
        part_lifespan_stage: ['Pediatric (birth-17 years)', 'Adult (18+ years)'],
        participant_count: 530,
        program: 'INCLUDE/KF',
        selection_criteria:
            'Inclusion criteria: documented (parent-report or medical record) live birth with trisomy 21 (including standard, translocation, mosaic karyotypes), no age restrictions, males and females, no ethnic or race restrictions, documentation related to heart status at birth (parent-report or medical record) on a subset, documentation related to a diagnosis of acute lymphoblastic leukemia on a subset, criteria:lack of consent and disease-specific or more restrictive data sharing',
        study_code: 'DS-COG-ALL',
        study_design: ['Case-Control', 'Parent-Offspring Trios', 'Germline-Tumor Pairs'],
        study_name:
            'INCLUDE: (Lupo) Genomic Analysis of Congenital Heart Defects and Acute Lymphoblastic Leukemia in Children with Down Syndrome',
    },
];

const sSchema = {
    title: 'Study',
    type: 'object',
    properties: {
        biorepo_email: {
            type: 'string',
        },
        biorepo_url: {
            type: 'string',
        },
        biospecimen_count: {
            type: 'integer',
        },
        contact_email: {
            type: 'string',
        },
        contact_name: {
            type: 'string',
        },
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
        data_source: {
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
                    dataset_id: {
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
                    data_type: {
                        type: 'string',
                    },
                    expected_data_categories: {
                        type: 'array',
                    },
                    experimental_strategy: {
                        type: 'string',
                    },
                    experimental_platform: {
                        type: 'string',
                    },
                    publication: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    access_limitation: {
                        type: 'string',
                    },
                    access_requirement: {
                        type: 'string',
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
                },
            },
        },
        date_collection_end_year: {
            type: 'string',
        },
        date_collection_start_year: {
            type: 'string',
        },
        description: {
            type: 'string',
        },
        domain: {
            type: 'string',
        },
        expected_data_categories: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        expected_number_participants: {
            type: 'integer',
        },
        external_id: {
            type: 'string',
        },
        file_count: {
            type: 'integer',
        },
        institution: {
            type: 'string',
        },
        investigator_name: {
            type: 'string',
        },
        part_lifespan_stage: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        participant_count: {
            type: 'integer',
        },
        program: {
            type: 'string',
        },
        publication: {
            type: 'array',
        },
        selection_criteria: {
            type: 'string',
        },
        study_code: {
            type: 'string',
        },
        study_design: {
            type: 'array',
            items: {
                type: 'string',
            },
        },
        study_name: {
            type: 'string',
        },
        website: {
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
