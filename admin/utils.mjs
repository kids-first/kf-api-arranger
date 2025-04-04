export const cbKeepClinicalIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study', 'specimen_tree'].some(stem => x.index.includes(stem));

export const cbKeepClinicalPlusTranscriptomicsIndicesOnly = x =>
    ['file', 'biospecimen', 'participant', 'study', `sample_gene_exp`, `diff_gene_exp`, 'specimen_tree'].some(stem =>
        x.index.includes(stem),
    );

export const isIndexNameFromTranscriptomics = index => index.includes('gene_exp');

//https://labex.io/tutorials/javascript-javascript-programming-fundamentals-28177
export const binomialCoefficient = (n, k) => {
    if (Number.isNaN(n) || Number.isNaN(k)) return NaN;
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k === 1 || k === n - 1) return n;
    if (n - k < k) k = n - k;

    let res = n;
    for (let i = 2; i <= k; i++) res *= (n - i + 1) / i;
    return Math.round(res);
};

//https://stackoverflow.com/questions/22566379/how-to-get-all-pairs-of-array-javascript
export const pairIt = l => l.map((v, i) => l.slice(i + 1).map(w => [v, w])).flat();
