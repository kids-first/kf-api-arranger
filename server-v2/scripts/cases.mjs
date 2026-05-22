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
        query: `{
            participant {
                hits(first: 2) {
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
