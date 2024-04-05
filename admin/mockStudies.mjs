import Ajv from 'ajv';

export const mockStudies = [
    {
        biobank_contact: 'dsresearch@cuanschutz.edu',
        biobank_request_link: 'https://redcap.link/HTPVBRrequest',
        biospecimen_count: 39430,
        contacts: [
            {
                email: 'dsresearch@cuanschutz.edu',
                name: 'Angela Rachubinski',
            },
        ],
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
        data_source: ['Investigator Assessment', 'Medical Record', 'Patient or Caregiver Report'],
        data_types: [
            {
                file_count: 2865,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 2865,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 433,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 433,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 7,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 800,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 477,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 418,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
            {
                file_count: 7,
                data_type: 'Other',
            },
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
                expected_data_categories: ['Transcriptomics'],
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
                expected_data_categories: ['Metabolomics'],
                expected_number_participants: 418,
                experimental_strategy: 'LCMS Metabolomics',
                experimental_platform: 'Ultra high-performance liquid chromatography-mass spectrometry (UHPLC-MS)',
                is_harmonized: false,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: 'phs002981',
                repository: '',
                repository_url: '',
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
                expected_data_categories: ['Clinical'],
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
                expected_data_categories: ['Proteomics'],
                expected_number_participants: 477,
                experimental_strategy: 'Multiplex immunoassay',
                experimental_platform: 'Meso Scale Discovery Assays (MSD)',
                is_harmonized: false,
                publications: ['PMID: 37379383'],
                access_limitations: ['general research use (DUO:0000042)'],
                access_requirements: [],
                dbgap: '',
                repository: '',
                repository_url: '',
                participant_count: 479,
                biospecimen_count: 4371,
                file_count: 477,
            },
        ],
        date_collection_end_year: '2020',
        date_collection_start_year: '2016',
        description:
            'The Human Trisome Project (HTP) is a large and comprehensive natural history study of Down syndrome involving collection of deep clinical data, multimodal phenotyping, a multi-dimensional biobank, generation of pan-omics datasets, and rapid release of data. The HTP has enabled many discoveries about the pathophysiology of Down syndrome, leading to new clinical trials testing  therapies to improve diverse health outcomes in this population.',
        domains: ['All co-occurring conditions'],
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
        file_count: 4975,
        guid: 'NDAR',
        institutions: ['Linda Crnic Institute for Down Syndrome'],
        investigator_names: ['Joaquin M. Espinosa'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 1062,
        program: 'INCLUDE',
        publications: [
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
        study_designs: ['Case-control', 'Longitudinal'],
        study_name: 'The Human Trisome Project',
        website: 'www.trisome.org',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 834,
        contacts: [
            {
                email: 'philip.lupo@bcm.edu',
                name: 'Phillip J Lupo',
            },
        ],
        controlled_access: ['Registered', 'Controlled'],
        data_category: ['Genomics', 'Clinical'],
        data_source: ['Unknown'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 834,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 475,
                data_type: 'GVCF',
            },
            {
                file_count: 2070,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 376,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 783,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 207,
                data_type: 'Somatic Structural Variations',
            },
            {
                file_count: 7,
                data_type: 'Other',
            },
        ],
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
        description:
            "This study is a collaboration with the trans-NIH INvestigation of Co-occurring conditions across the Lifespan to Understand Down syndrome (INCLUDE) Project, which seeks to improve health and quality-of-life for individuals with Down syndrome, and NHLBI's TransOmics for Precision Medicine (TOPMed) program, which seeks to apply omics technologies to improve scientific understanding of the fundamental biological processes that underlie heart, lung, blood, and sleep (HLBS) disorders. Additional Pediatric Cardiac Genetics Consortium (PCGC) data from children affected with Down syndrome and congenital heart disease are accessible through two separate dbGaP studies: phs001138 (Kids First) and phs001194 (TOPMed).",
        domains: ['Hematologic Diseases'],
        expected_data_categories: ['Genomics', 'Clinical', 'Unharmonized Demographic/Clinical'],
        expected_number_participants: 530,
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
        file_count: 7211,
        guid: 'No GUID',
        institutions: ['Baylor College Of Medicine'],
        investigator_names: ['Phillip J. Lupo'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 530,
        program: 'INCLUDE/KF',
        publications: [],
        selection_criteria:
            'Inclusion criteria: documented (parent-report or medical record) live birth with trisomy 21 (including standard, translocation, mosaic karyotypes), no age restrictions, males and females, no ethnic or race restrictions, documentation related to heart status at birth (parent-report or medical record) on a subset, documentation related to a diagnosis of acute lymphoblastic leukemia on a subset. Exclusion criteria: lack of consent and disease-specific or more restrictive data sharing ',
        study_code: 'DS-COG-ALL',
        study_designs: ['Case-control,parent-offspring trios, germline-tumor pairs'],
        study_name:
            'INCLUDE: (Lupo) Genomic Analysis of Congenital Heart Defects and Acute Lymphoblastic Leukemia in Children with Down Syndrome',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 1344,
        contacts: [
            {
                email: 'trosser@emory.edu',
                name: 'Tracie Rosser',
            },
        ],
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        data_source: ['Unknown'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 1344,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 1344,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 786,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
            {
                file_count: 0,
                data_type: 'Other',
            },
        ],
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
        description:
            "This study is a collaboration with the trans-NIH INvestigation of Co-occurring conditions across the Lifespan to Understand Down syndrome (INCLUDE) Project, which seeks to improve health and quality-of-life for individuals with Down syndrome, and NHLBI's TransOmics for Precision Medicine (TOPMed) program, which seeks to apply omics technologies to improve scientific understanding of the fundamental biological processes that underlie heart, lung, blood, and sleep (HLBS) disorders. Additional Pediatric Cardiac Genetics Consortium (PCGC) data from children affected with Down syndrome and congenital heart disease are accessible through two separate dbGaP studies: phs001138 (Kids First) and phs001194 (TOPMed).",
        domains: ['Congenital Heart Defects'],
        expected_data_categories: ['Genomics', 'Clinical', 'Unharmonized Demographic/Clinical'],
        expected_number_participants: 1327,
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
        file_count: 4922,
        guid: 'No GUID',
        institutions: ['Emory University School of Medicine'],
        investigator_names: ['Stephanie Sherman'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 1327,
        program: 'INCLUDE/KF',
        publications: [],
        selection_criteria:
            'Inclusion criteria: documented (parent-report or medical record) live birth with trisomy 21 (including standard, translocation, mosaic karyotypes), no age restrictions, males and females, no ethnic or race restrictions, documentation related to heart status at birth (parent-report or medical record) on a subset, documentation related to a diagnosis of acute lymphoblastic leukemia on a subset. Exclusion criteria: lack of consent and disease-specific or more restrictive data sharing',
        study_code: 'DS360-CHD',
        study_designs: ['Case-control,parent-offspring trios, germline-tumor pairs'],
        study_name:
            'INCLUDE: (Sherman) Genomic Analysis of Congenital Heart Defects and Acute Lymphoblastic Leukemia in Children with Down Syndrome',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 1344,
        contacts: [
            {
                email: 'eileen.king@cchmc.org',
                name: 'Eileen C. King',
            },
        ],
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        data_source: ['Medical Record', 'Participant or Caregiver Report'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Other',
            },
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 369,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 369,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 40,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
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
        description:
            "This study is a collaboration with the trans-NIH INvestigation of Co-occurring conditions across the Lifespan to Understand Down syndrome (INCLUDE) Project, which seeks to improve health and quality-of-life for individuals with Down syndrome, and NHLBI's TransOmics for Precision Medicine (TOPMed) program, which seeks to apply omics technologies to improve scientific understanding of the fundamental biological processes that underlie heart, lung, blood, and sleep (HLBS) disorders. Additional Pediatric Cardiac Genetics Consortium (PCGC) data from children affected with Down syndrome and congenital heart disease are accessible through two separate dbGaP studies: phs001138 (Kids First) and phs001194 (TOPMed).",
        domains: ['Congenital Heart Defects', 'All Co-occurring Conditions'],
        expected_data_categories: ['Genomics', 'Clinical', 'Unharmonized Demographic/Clinical'],
        expected_number_participants: 369,
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
        file_count: 818,
        guid: 'No GUID',
        institutions: ["Cincinnati Children's Hospital Medical Center"],
        investigator_names: ['Eileen C. King'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 369,
        program: 'INCLUDE/KF',
        publications: [],
        selection_criteria:
            'Inclusion criteria: documented (parent-report or medical record) live birth with trisomy 21 (including standard, translocation, mosaic karyotypes), no age restrictions, males and females, no ethnic or race restrictions, documentation related to heart status at birth (parent-report or medical record) on a subset, documentation related to a diagnosis of acute lymphoblastic leukemia on a subset. Exclusion criteria: lack of consent and disease-specific or more restrictive data sharing',
        study_code: 'DS-PCGC',
        study_designs: [],
        study_name:
            'INCLUDE: (PCGC) Genomic Analysis of Congenital Heart Defects and Acute Lymphoblastic Leukemia in Children with Down Syndrome',
        website: '',
    },
    {
        biobank_contact: 'hakonarson@chop.edu',
        biobank_request_link: '',
        biospecimen_count: 1908,
        contacts: [
            {
                email: 'snyderj3@chop.edu',
                name: 'James Snyder',
            },
            {
                email: 'hakonarson@chop.edu',
                name: 'Hakon Hakonarson',
            },
        ],
        controlled_access: ['Registered'],
        data_category: ['Genomics', 'Transcriptomics', 'Imaging', 'Clinical'],
        data_source: ['Unknown'],
        data_types: [
            {
                file_count: 468,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 229,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 376,
                data_type: 'Variant Calls',
            },
            {
                file_count: 1167,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 783,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 467,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 234,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
            {
                file_count: 0,
                data_type: 'Other',
            },
        ],
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
        description:
            "Down syndrome (DS) is the most common chromosomal abnormality in live births, with an incidence of 1 in 700 in the US. To better understand the pathophysiology of DS, this proposal will generate and analyze sequence data on 777 pediatric DS patients from the Children's Hospital of Philadelphia (CHOP), as well as 321 mothers and 148 fathers. We anticipate that the information derived from this deeply phenotyped cohort will allow for improved understanding of the pathophysiology and molecular mechanisms underlying DS-associated comorbidities, which may inform on new practices for treatment or innovative future therapies.",
        domains: ['All Co-occurring Conditions'],
        expected_data_categories: ['Genomics', 'Transcriptomics', 'Imaging', 'Clinical'],
        expected_number_participants: 1152,
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
        file_count: 2565,
        guid: 'No GUID',
        institutions: ["Children's Hospital of Philadelphia"],
        investigator_names: ['Hakon Hakonarson'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 1152,
        program: 'INCLUDE',
        publications: [],
        selection_criteria: '',
        study_code: 'X01-Hakonarson',
        study_designs: ['Singletons, trios and single-parent dyads'],
        study_name:
            'Genetic underpinnings of the multifactorial phenotype of Trisomy 21 patients unveiled by multi-omics approaches',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 436,
        contacts: [
            {
                email: 'Irene.roberts@paediatrics.ox.ac.uk',
                name: 'Irene Roberts',
            },
            {
                email: 'desmith@usc.edu',
                name: 'Adam de Smith',
            },
        ],
        controlled_access: ['Registered'],
        data_category: ['Clinical'],
        data_source: ['Unknown'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 0,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
            {
                file_count: 0,
                data_type: 'Other',
            },
        ],
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
        description:
            'Children with Down syndrome (DS) have an extremely high risk of developing acute myeloid leukemia, and this is preceded by a transient myeloid leukemia that presents in up to 30% of newborns with DS and can lead to early death. In this study, we will investigate the role of germline genetic risk factors in modifying the risk of transient myeloid leukemia in DS. We examined patient germline samples (n=470), including 130 cases with GATA1 mutations and 340 controls without GATA1 mutations. Our results will shed light on the etiology of myeloid leukemia in children with DS.',
        domains: ['Hematologic Diseases'],
        expected_data_categories: ['Genomics', 'Clinical'],
        expected_number_participants: 436,
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
        file_count: 0,
        guid: 'No GUID',
        institutions: ['University of Oxford'],
        investigator_names: ['Adam de Smith'],
        is_harmonized: true,
        part_lifespan_stages: ['Neonatal'],
        participant_count: 1152,
        program: 'INCLUDE',
        publications: [],
        selection_criteria:
            'Patient germline samples (n=470), including 130 cases with GATA1 mutations and 340 controls without GATA1 mutations',
        study_code: 'X01-deSmith',
        study_designs: ['Case-control'],
        study_name: 'The epidemiology of transient leukemia in newborns with Down syndrome',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 23,
        contacts: [
            {
                email: 'bkhor@benaroyaresearch.org',
                name: 'Bernard Khor',
            },
        ],
        controlled_access: ['Registered'],
        data_category: ['Transcriptomics', 'Clinical'],
        data_source: ['Medical Record', 'Participant or Caregiver Report'],
        data_types: [
            {
                file_count: 115,
                data_type: 'Other',
            },
            {
                file_count: 46,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 46,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 23,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 23,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 0,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        description:
            'The Down syndrome registry at Benaroya Research Institute (BRI) builds on institutional expertise to collect and analyze longitudinal biological samples and concomitant clinical metadata across the lifespan of people with Down syndrome. The goal is to help advance therapeutic approaches to predict, prevent and cure co-occurring conditions of Down syndrome.',
        domains: ['Immune System Diseases'],
        expected_data_categories: ['Transcriptomics', 'Clinical'],
        expected_number_participants: 167,
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
        file_count: 253,
        guid: 'No GUID',
        institutions: ['Benaroya Research Institute'],
        investigator_names: ['Jane Buckner'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 167,
        program: 'INCLUDE',
        publications: ['PMID: 35020411'],
        selection_criteria: 'Individuals with DS, aged 2-55',
        study_code: 'BRI-DSR',
        study_designs: ['Case-control'],
        study_name: 'Benaroya Research Institute Down Syndrome Registry',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 41,
        contacts: [
            {
                email: 'dsresearch@cuanschutz.edu',
                name: 'Joaquin Espinosa',
            },
        ],
        controlled_access: ['Controlled'],
        data_category: ['Genomics', 'Clinical'],
        data_source: ['Medical Record', 'Participant or Caregiver Report'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Other',
            },
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 41,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 41,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 41,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        description:
            'The Nexus is a patient registry, clinical database, and biological sample bank focused on developmental disorders. Its major goal is to advance research by (i) linking human cognitive, behavioral, neurological and other clinical phenotypes to biological samples, including DNA, plasma, and lymphoblastoid cell lines, and (ii) facilitating access to appropriate patient cohorts for research purposes. The Nexus is unique among biorepositories in that it combines extensive clinical data and biosamples, and emphasizes the inclusion of quantitative cognitive and behavioral data.',
        domains: ['Behavior and Behavior Mechanisms', 'All Co-occurring Conditions'],
        expected_data_categories: ['Genomics', 'Clinical'],
        expected_number_participants: 600,
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
        file_count: 123,
        guid: 'No GUID',
        institutions: ['Linda Crnic Institute for Down Syndrome'],
        investigator_names: ['Joaquin Espinosa'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 41,
        program: 'INCLUDE/KF',
        publications: [],
        selection_criteria: '',
        study_code: 'DS-NEXUS',
        study_designs: ['Patient registry', 'Observational study'],
        study_name: 'Nexus Translational Biobank',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 0,
        contacts: [
            {
                email: 'clmartin1@geisinger.edu',
                name: 'Christa Martin',
            },
        ],
        controlled_access: [],
        data_category: ['Clinical'],
        data_source: ['Medical Record', 'Participant or Caregiver Report', 'Investigator Assessment'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Other',
            },
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 0,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        description:
            'The present work falls under an administrative supplement to study Down syndrome (DS) within the existing grant, "Dimensional Analysis of Developmental Brain Disorders using an Online, Genome First Approach" (R01-MH107431). The study aims to build validated, quantitative measures of psychopathology for DS.',
        domains: ['Sleep Wake Disorders', 'Behavior and Behavior Mechanisms', 'All Co-occurring Conditions'],
        expected_data_categories: ['Clinical'],
        expected_number_participants: 79,
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
        file_count: 0,
        guid: 'NDAR',
        institutions: ['Geisinger Health System'],
        investigator_names: ['Christa Martin'],
        is_harmonized: true,
        part_lifespan_stages: ['Pediatric', 'Adult'],
        participant_count: 79,
        program: 'INCLUDE',
        publications: [],
        selection_criteria: '',
        study_code: 'DS-Sleep',
        study_designs: ['Trios or duos'],
        study_name: 'Dimensional, Sleep, and Genomic Analyses of Down Syndrome to Elucidate Phenotypic Variability',
        website: '',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 0,
        contacts: [
            {
                email: 'sujata.bardhan@nih.gov',
                name: 'Sujata Bardhan',
            },
        ],
        controlled_access: [],
        data_category: ['Clinical'],
        data_source: ['Participant or Caregiver Report'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Other',
            },
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 0,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
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
        description:
            'DS-Connect is an online survey tool designed to collect demographic data and basic health information from individuals with DS. The purposes of DS-Connect: The Down Syndrome Registry are to better understand the health of people with Down syndrome and to inform eligible participants who, based on their health history, may be a match for research studies or new clinical trials.',
        domains: ['Behavior and Behavior Mechanisms', 'All Co-occurring Conditions'],
        expected_data_categories: ['Clinical'],
        expected_number_participants: 100000,
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
        file_count: 0,
        guid: 'NDAR',
        institutions: ['Eunice Kennedy Shriver National Institute of Child Health and Human Development'],
        investigator_names: ['Sujata Bardhan'],
        is_harmonized: true,
        part_lifespan_stages: ['Fetal', 'Adult', 'Pediatric', 'Neonatal'],
        participant_count: 3634,
        program: 'INCLUDE',
        publications: [],
        selection_criteria: 'Individuals with DS (including those with mosaic DS and partial trisomy 21)',
        study_code: 'DSC',
        study_designs: ['Online survey'],
        study_name: 'DS-Connect: The Down Syndrome Registry',
        website: 'https://dsconnect.nih.gov',
    },
    {
        biobank_contact: '',
        biobank_request_link: '',
        biospecimen_count: 0,
        contacts: [
            {
                email: 'jov18@pitt.edu',
                name: 'Joni Vander Bilt',
            },
        ],
        controlled_access: [],
        data_category: ['Clinical'],
        data_source: ['Medical Record', 'Participant or Caregiver Report', 'Investigator Assessment'],
        data_types: [
            {
                file_count: 0,
                data_type: 'Other',
            },
            {
                file_count: 0,
                data_type: 'Gene Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Raw Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Gene Fusions',
            },
            {
                file_count: 0,
                data_type: 'Isoform Expression Quantifications',
            },
            {
                file_count: 0,
                data_type: 'Aligned Reads',
            },
            {
                file_count: 0,
                data_type: 'GVCF',
            },
            {
                file_count: 0,
                data_type: 'Simple Nucleotide Variations',
            },
            {
                file_count: 0,
                data_type: 'Variant Calls',
            },
            {
                file_count: 0,
                data_type: 'Alternative Splicing',
            },
            {
                file_count: 0,
                data_type: 'Unaligned Reads',
            },
            {
                file_count: 0,
                data_type: 'Somatic Copy Number Variations',
            },
            {
                file_count: 0,
                data_type: 'Protein abundance (absolute protein concentration)',
            },
            {
                file_count: 0,
                data_type: 'Preprocessed metabolite relative abundance',
            },
            {
                file_count: 0,
                data_type: 'Somatic Structural Variations',
            },
        ],
        dataset: [],
        date_collection_end_year: '',
        date_collection_start_year: '',
        description:
            "The goal of the Alzheimer Biomarker Consortium-Down Syndrome (ABC-DS) is to study a group of adults with Down syndrome over their lives to single out early biomarkers of the onset of Alzheimer's disease.\n\nNOTE: Access to the full ABC-DS dataset, including clinical, cognitive, neuroimaging, and genetic data, must be requested from ABC-DS using the data request form (https://pitt.co1.qualtrics.com/jfe/form/SV_cu0pNCZZlrdSxUN).",
        domains: ['Behavior and Behavior Mechanisms'],
        expected_data_categories: ['Clinical'],
        expected_number_participants: 550,
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
        file_count: 0,
        guid: 'NDAR',
        institutions: ['University of Pittsburgh'],
        investigator_names: ['Bradley T. Christian'],
        is_harmonized: true,
        part_lifespan_stages: ['Adult'],
        participant_count: 417,
        program: 'INCLUDE',
        publications: [],
        selection_criteria: 'Adults 25 years and older with DS',
        study_code: 'ABC-DS',
        study_designs: ['Case-control'],
        study_name: 'Alzheimer Biomarker Consortium - Down Syndrome',
        website: 'https://www.nia.nih.gov/research/abc-ds',
    },
];

const sSchema = {
    title: 'Study',
    type: 'object',
    properties: {
        biobank_contact: {
            type: 'string',
        },
        biobank_request_link: {
            type: 'string',
        },
        biospecimen_count: {
            type: 'integer',
        },
        contacts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                    },
                    email: {
                        type: 'string',
                    },
                },
            },
        },
        data_types: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    file_count: {
                        type: 'integer',
                    },
                    data_type: {
                        type: 'string',
                    },
                },
            },
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
                    expected_data_categories: {
                        type: 'array',
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
        description: {
            type: 'string',
        },
        domains: {
            type: 'array',
            items: {
                type: 'string',
            },
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
        file_count: {
            type: 'integer',
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
        guid: {
            type: 'string',
        },
        part_lifespan_stages: {
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
        publications: {
            type: 'array',
        },
        selection_criteria: {
            type: 'string',
        },
        study_code: {
            type: 'string',
        },
        study_designs: {
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
