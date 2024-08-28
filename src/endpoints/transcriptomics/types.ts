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

export type DiffGeneExpPoint = {
    gene_symbol: string;
    x: number;
    y: number;
};

export type DiffGeneExpVolcano = {
    id: string;
    data: DiffGeneExpPoint[];
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
