// Shared CASES — consumed by fetch-baselines.mjs (to populate baselines.json
// from a real arranger) and by diff-real.mjs (to compare server-v2 against
// those baselines).
//
// Case shape:
//   {
//     name:   'short label',
//     query:  '<GraphQL string>'  // or  { query, variables }
//     ignore: ['$.path.to.skip'],  // prefix-match — see filterIgnore() in diff-real.mjs
//   }
//
// No `expected` field — baselines come from baselines.json (written by
// fetch-baselines.mjs). For a case not present in baselines.json, diff-real
// falls back to CAPTURE mode (prints server-v2's response only).

export const CASES = [
    {
        name: 'S: participant hits scalars',
        // Explicit sort: ES has no stable order without one, and segment
        // merges/refreshes drift the implicit order over time.
        query: `{
            participant {
                hits(first: 2, sort: [{ field: "participant_id", order: asc }]) {
                    total
                    edges { node { participant_id sex } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'T-stats: study biospecimen_count stats',
        query: `{
            study {
                aggregations {
                    biospecimen_count { stats { count min max avg sum } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'T-buckets: study domains buckets',
        query: `{
            study {
                aggregations {
                    domains { buckets { key doc_count } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'U-extended: participant extended (length spot-check)',
        query: `{ participant { extended } }`,
        ignore: [],
    },

    {
        name: 'U-columnsState: frontend reports query for participant',
        query: `query columnsStateQuery {
            participant {
                columnsState {
                    state {
                        type
                        keyField
                        defaultSorted { id desc }
                        columns { field accessor show type sortable canChangeShow query jsonPath }
                    }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'V-single: study contacts hits.edges',
        query: `{
            study {
                hits(first: 3) {
                    edges {
                        node {
                            study_code
                            contacts {
                                hits {
                                    total
                                    edges { node { name email institution } }
                                }
                            }
                        }
                    }
                }
            }
        }`,
        ignore: [],
    },

    // Real frontend payload — biospecimen. Exercises:
    //  - SQON `op: 'all'` (must-all-values branch in buildQuery)
    //  - Nested filter through an object container (participant.mondo.name —
    //    participant is an object on biospecimen, mondo is nested under it)
    //  - Extra FE-side cruft (`remoteComponent` field on the SQON leaf)
    //    that arranger's buildQuery silently ignores
    //  - Sort on a scalar field (sample_id asc) with single-key searchAfter
    //  - Mix of scalars + object child (study, participant) + nested (files)
    {
        name: 'FE: searchBiospecimen (sqon op:all, nested-thru-object, sort)',
        query: {
            operationName: 'searchBiospecimen',
            variables: {
                first: 50,
                offset: 0,
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'all',
                        content: {
                            field: 'participant.mondo.name',
                            index: 'participant',
                            remoteComponent: {
                                id: 'mondoTree',
                                props: { visible: true, field: 'mondo' },
                            },
                            value: ['human disease (MONDO:0700096)'],
                        },
                    }],
                },
                sort: [{ field: 'sample_id', order: 'asc' }],
            },
            query: `query searchBiospecimen($sqon: JSON, $first: Int, $offset: Int, $sort: [Sort], $searchAfter: JSON) {
                biospecimen {
                    hits(filters: $sqon, first: $first, offset: $offset, sort: $sort, searchAfter: $searchAfter) {
                        total
                        edges {
                            searchAfter
                            node {
                                id fhir_id container_id status
                                sample_id external_sample_id sample_type
                                parent_sample_id parent_sample_type
                                collection_sample_id collection_sample_type collection_fhir_id
                                age_at_biospecimen_collection laboratory_procedure
                                volume volume_unit biospecimen_storage
                                study_id
                                study { study_code study_id study_name }
                                nb_files
                                participant { participant_id }
                                files { hits { total } }
                            }
                        }
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — SQON `op: 'not-in'` (must_not ES branch),
    // anonymous query (no operationName), aggregation on a *object-child*
    // path (study.study_code → result key `study__study_code` with dot→__
    // rewrite), and `include_missing: false`.
    {
        name: 'FE: anonymous participant hits+aggs (sqon op:not-in, object-child agg)',
        query: {
            variables: {
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'not-in',
                        content: {
                            field: 'study.study_code',
                            index: 'participant',
                            value: ['HTP'],
                        },
                    }],
                },
            },
            query: `query ($sqon: JSON) {
                participant {
                    hits(filters: $sqon) { total }
                    aggregations(filters: $sqon, aggregations_filter_themselves: true, include_missing: false) {
                        study__study_code { buckets { key doc_count } }
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — combined hits + aggregations under one
    // operation (Apollo fires both ES calls in parallel). Also exercises
    // `aggregations_filter_themselves: true` (the facet-picker branch in
    // slice T) and SQON on a nested-field child path (files.file_id, where
    // files is nested on participant).
    {
        name: 'FE: AggregationDemographicInfo (hits+aggs combined, aggregations_filter_themselves)',
        query: {
            operationName: 'AggregationDemographicInfo',
            variables: {
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'in',
                        content: {
                            field: 'files.file_id',
                            index: 'file',
                            value: ['HTP.001149dc-4fe5-4479-b846-4e4b23aef309.single.vqsr.filtered.vep_105.vcf.gz'],
                        },
                    }],
                },
            },
            query: `query AggregationDemographicInfo($sqon: JSON) {
                participant {
                    hits(filters: $sqon) { total }
                    aggregations(filters: $sqon, aggregations_filter_themselves: true) {
                        sex { buckets { key doc_count } }
                        ethnicity { buckets { key doc_count } }
                        race { buckets { key doc_count } }
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — SQON with `op: 'between'` (numeric range).
    // Exercises a different `@arranger/middleware.buildQuery` branch than the
    // `in`-only cases we've covered.
    {
        name: 'FE: getVariantsCount (sqon op:between)',
        query: {
            operationName: 'getVariantsCount',
            variables: {
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'between',
                        content: {
                            field: 'start',
                            index: 'variants',
                            value: [100000, 1000000],
                        },
                    }],
                },
            },
            query: `query getVariantsCount($sqon: JSON) {
                variants {
                    hits(filters: $sqon) {
                        total
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — single file lookup by file_id. Exercises
    // nested-within-nested (file → participants → biospecimens), nested-with-
    // object-child (participants.node.study is an object, not nested),
    // arrays-of-scalars (dataset_names), and shallow object containers
    // (hashes, study at file level).
    {
        name: 'FE: getFileEntity (sqon + nested-within-nested + object-in-nested)',
        query: {
            operationName: 'getFileEntity',
            variables: {
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'in',
                        content: {
                            field: 'file_id',
                            value: 'HTP.001149dc-4fe5-4479-b846-4e4b23aef309.single.vqsr.filtered.vep_105.vcf.gz',
                            index: 'file',
                        },
                    }],
                },
            },
            query: `query getFileEntity($sqon: JSON) {
                file {
                    hits(filters: $sqon) {
                        edges {
                            node {
                                id
                                access_urls
                                participants {
                                    hits {
                                        total
                                        edges {
                                            node {
                                                biospecimens {
                                                    hits {
                                                        total
                                                        edges {
                                                            node {
                                                                sample_id
                                                                sample_type
                                                                collection_sample_id
                                                                collection_sample_type
                                                            }
                                                        }
                                                    }
                                                }
                                                down_syndrome_status
                                                participant_id
                                                study { study_code external_id }
                                                study_id
                                            }
                                        }
                                    }
                                }
                                controlled_access
                                data_category
                                data_type
                                dataset_names
                                file_id
                                file_name
                                file_format
                                hashes { etag }
                                nb_biospecimens
                                nb_participants
                                sequencing_experiment {
                                    hits { edges { node { experiment_strategy } } }
                                }
                                size
                                study { external_id study_code study_id study_name }
                            }
                        }
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — minimal count query with SQON filter on a
    // NESTED-field child path (mondo.name → ES needs `nested` query wrap
    // on path "mondo"). Tests buildQuery's nested-field detection.
    {
        name: 'FE: getParticipantCount (sqon on nested-field child)',
        query: {
            operationName: 'getParticipantCount',
            variables: {
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'in',
                        content: {
                            field: 'mondo.name',
                            value: 'complete trisomy 21 (MONDO:0700030)',
                            index: 'participant',
                        },
                    }],
                },
            },
            query: `query getParticipantCount($sqon: JSON) {
                participant {
                    hits(filters: $sqon) {
                        total
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — biospecimen_trees with SQON filter on a flat
    // scalar (collection_fhir_id). `tree_str` is an opaque stringified-JSON
    // blob (keyword type) — server-v2 passes through unchanged.
    {
        name: 'FE: getHierarchicalBiospecimen (sqon + flat scalars + opaque tree_str)',
        query: {
            operationName: 'getHierarchicalBiospecimen',
            variables: {
                first: 100,
                offset: 0,
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'in',
                        content: { field: 'collection_fhir_id', value: ['bs-2zbedhefdn'] },
                    }],
                },
            },
            query: `query getHierarchicalBiospecimen($sqon: JSON, $first: Int, $offset: Int, $sort: [Sort]) {
                biospecimen_trees {
                    hits(filters: $sqon, first: $first, offset: $offset, sort: $sort) {
                        total
                        edges {
                            node {
                                fhir_id
                                tree_str
                                sample_id
                                collection_fhir_id
                            }
                        }
                    }
                }
            }`,
        },
        ignore: [],
    },

    // Real frontend payload — exercises sort + sqon + searchAfter on hits()
    // plus deep nested traversal (variants → genes → consequences/hpo/omim/...).
    {
        name: 'FE: searchVariant (sort + sqon + nested deep)',
        query: {
            operationName: 'searchVariant',
            variables: {
                first: 20,
                offset: 0,
                sqon: {
                    op: 'and',
                    content: [{
                        op: 'in',
                        content: { field: 'clinvar.clin_sig', index: 'variants', value: ['Pathogenic'] },
                    }],
                },
                sort: [
                    { field: 'max_impact_score', order: 'desc' },
                    { field: 'hgvsg', order: 'asc' },
                    { field: 'locus', order: 'asc' },
                ],
            },
            query: `query searchVariant($sqon: JSON, $first: Int, $offset: Int, $sort: [Sort], $searchAfter: JSON) {
                variants {
                    hits(filters: $sqon, first: $first, offset: $offset, sort: $sort, searchAfter: $searchAfter) {
                        total
                        edges {
                            searchAfter
                            node {
                                alternate assembly_version chromosome
                                clinvar { clin_sig clinvar_id conditions inheritance interpretations }
                                dna_change end
                                external_frequencies {
                                    topmed_bravo { ac af an hom het }
                                    gnomad_exomes_2_1_1 { ac af an hom }
                                    gnomad_genomes_2_1_1 { ac af an hom }
                                    gnomad_genomes_3 { ac af an hom }
                                    thousand_genomes { ac af an }
                                }
                                gene_external_reference
                                genes {
                                    hits {
                                        total
                                        edges {
                                            node {
                                                alias biotype
                                                consequences { hits { total edges { node {
                                                    aa_change amino_acids { reference variant }
                                                    canonical cdna_position cds_position coding_dna_change
                                                    codons { reference variant }
                                                    consequence
                                                    conservations { phyloP100way_vertebrate phyloP17way_primate }
                                                    ensembl_feature_id ensembl_transcript_id
                                                    exon { rank total }
                                                    feature_type hgvsc hgvsp impact_score
                                                    intron { rank total }
                                                    mane_plus mane_select picked
                                                    predictions {
                                                        cadd_phred cadd_score dann_score
                                                        fathmm_pred fathmm_score lrt_pred lrt_score
                                                        polyphen2_hvar_pred polyphen2_hvar_score
                                                        revel_score sift_pred sift_score
                                                    }
                                                    protein_position refseq_mrna_id strand uniprot_id vep_impact
                                                } } } }
                                                cosmic { hits { total edges { node { tumour_types_germline } } } }
                                                ddd { hits { total edges { node { disease_name } } } }
                                                ensembl_gene_id entrez_gene_id
                                                gnomad { loeuf pli }
                                                hgnc
                                                hpo { hits { total edges { node { hpo_term_id hpo_term_label hpo_term_name } } } }
                                                location name
                                                omim { hits { total edges { node { inheritance inheritance_code name omim_id } } } }
                                                omim_gene_id
                                                orphanet { hits { total edges { node { disorder_id panel inheritance } } } }
                                                symbol
                                            }
                                        }
                                    }
                                }
                                hash hgvsg id
                                internal_frequencies { total { ac pc hom pn an af pf } }
                                locus max_impact_score reference rsnumber start
                                studies {
                                    hits {
                                        total
                                        edges {
                                            node {
                                                score study_code study_id
                                                total { ac pc hom pn an af pf }
                                                transmission participant_ids zygosity
                                            }
                                        }
                                    }
                                }
                                variant_class
                                variant_id: id
                            }
                        }
                    }
                }
            }`,
        },
        ignore: [],
    },
];
