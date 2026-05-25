// TEMPORARY — hardcoded fallback for the `isArray` flag on multi-value scalars.
//
// ES `_mapping` does not distinguish single-value from multi-value scalar
// fields, so we can't recover this from the mapping alone. The intended
// long-term source is per-field `meta.isArray: "true"` set by the ETL when it
// pushes the mapping (mappings.properties.<field>.meta — ES native feature,
// 5-entry / 20-char-key / 50-char-value limit, all string).
//
// Until the ETL adopts that convention, this module supplies the same data
// as a hardcoded list, extracted from the arranger-projects-include QA doc
// on 2026-05-25 (60 scalar-array paths across 6 of the 7 entities). Nested
// fields are NOT listed here — they are auto-detected as arrays by the
// deriver (ES `nested`-type fields are always JSON arrays).
//
// Delete this module once every esIndex has `meta.isArray` set on the
// relevant fields and the deriver no longer logs fallback paths at boot.

const BIOSPECIMEN_CENTRIC = new Set<string>(['diagnoses.source_text_tumor_location']);

const FILE_CENTRIC = new Set<string>([
    'acl',
    'dataset_names',
    'imaging_sequence_types',
    'imaging_techniques',
    'participants.biospecimens.diagnoses.source_text_tumor_location',
    'participants.down_syndrome_diagnosis',
]);

const STUDY_CENTRIC = new Set<string>([
    'clinical_trials.arms_information',
    'clinical_trials.intervention_types',
    'clinical_trials.interventions',
    'clinical_trials.primary_outcome_measures',
    'clinical_trials.secondary_outcome_measures',
    'controlled_access',
    'data_category',
    'data_sources',
    'datasets.access_limitations',
    'datasets.access_requirements',
    'datasets.data_categories',
    'datasets.data_types',
    'datasets.expected_data_categories',
    'datasets.publications',
    'datasets.publications_details.accessed_date_parts',
    'datasets.publications_details.issued_date_parts',
    'domains',
    'expected_data_categories',
    'external_ids',
    'institutions',
    'investigator_names',
    'part_lifespan_stages',
    'publications',
    'publications_details.accessed_date_parts',
    'publications_details.issued_date_parts',
    'selection_criteria',
    'study_designs',
    'study_meta_categories',
    'study_websites',
]);

const VARIANT_CENTRIC = new Set<string>([
    'clinvar.clin_sig',
    'clinvar.conditions',
    'clinvar.inheritance',
    'clinvar.interpretations',
    'gene_external_reference',
    'genes.alias',
    'genes.consequences.consequence',
    'genes.consequences.refseq_mrna_id',
    'genes.cosmic.tumour_types_germline',
    'genes.omim.inheritance',
    'genes.omim.inheritance_code',
    'genes.orphanet.inheritance',
    'genes.spliceai.type',
    'studies.participant_ids',
    'studies.transmission',
    'studies.zygosity',
]);

const GENE_CENTRIC = new Set<string>(['alias']);

const PARTICIPANT_CENTRIC = new Set<string>([
    'condition_source_texts',
    'down_syndrome_diagnosis',
    'files.biospecimens.diagnoses.source_text_tumor_location',
    'mondo.parents',
    'observed_phenotype.age_at_event_days',
    'observed_phenotype.parents',
    'person.links',
]);

const BY_INDEX: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ['biospecimen_centric', BIOSPECIMEN_CENTRIC],
    ['file_centric', FILE_CENTRIC],
    ['study_centric', STUDY_CENTRIC],
    ['variant_centric', VARIANT_CENTRIC],
    ['gene_centric', GENE_CENTRIC],
    ['participant_centric', PARTICIPANT_CENTRIC],
    // specimen_tree_centric has no scalar-array fields per the QA audit.
]);

export function getArrayFieldsFallback(esIndex: string): ReadonlySet<string> {
    return BY_INDEX.get(esIndex) ?? new Set<string>();
}
