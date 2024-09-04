export type DiffGeneExp = {
    external_dataset_id: string;
    statistical_method: string;
    comparison: string;
    model_specification: string;
    ensembl_gene_id: string;
    feature_id_type: string;
    gene_symbol: string;
    padj: number;
    padj_type: string;
    chromosome: string;
    gene_start: string;
    gene_end: string;
    gene_type: string;
    study_id: string;
    release_id: string;
    fold_change: number;
    p_value: number;
    x: number;
    y: number;
    category: string;
};

export type SampleGeneExp = {
    external_dataset_id: string;
    sample_id: string;
    external_sample_type: string;
    ensembl_gene_id: string;
    feature_id_type: string;
    gene_symbol: string;
    value: number;
    units: string;
    sex: string;
    sample_source: string;
    external_sample_id: string;
    biotype: string;
    study_id: string;
    release_id: string;
    down_syndrome_status: number;
    age_at_biospecimen_collection_years: number;
    x: number;
    y: number;
};

export type DiffGeneExpPoint = {
    gene_symbol: string;
    x: number;
    y: number;
    chromosome: string;
};

export type DiffGeneExpVolcano = {
    id: string;
    data: DiffGeneExpPoint[];
};

export type SampleGeneExpPoint = {
    sample_id: string;
    x: number;
    y: number;
};

export type SampleGeneExpVolcano = {
    data: SampleGeneExpPoint[];
    gene_symbol: string;
    nControl: number;
    nT21: number;
};

export type FetchDiffGeneExpResponse = {
    by_category: {
        buckets: {
            key: string;
            by_id: {
                buckets: {
                    docs: {
                        hits: {
                            hits: {
                                _source: DiffGeneExp;
                            }[];
                        };
                    };
                }[];
            };
        }[];
    };
};

export type Facets = {
    chromosome: {
        key: string;
        doc_count: number;
    }[];
};
