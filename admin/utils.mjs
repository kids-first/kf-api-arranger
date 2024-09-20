export const cbKeepClinicalIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study'].some(stem => x.index.includes(stem));

export const cbKeepClinicalPlusTranscriptomicsIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study', `sample_gene_exp`, `diff_gene_exp`].some(stem =>
        x.index.includes(stem),
    );

export const isIndexNameFromTranscriptomics = index => index.includes('gene_exp');