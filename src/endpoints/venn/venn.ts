import { buildQuery } from '@arranger/middleware';
import { default as SQONBuilder, SQON as v3SQON } from '@overture-stack/sqon-builder';

import EsInstance from '../../ElasticSearchClientInstance';
import { getNestedFieldsForIndex } from '../../sqon/getNestedFieldsForIndex';
import { renameFieldNameToField, renameFieldToFieldName } from '../../sqon/manipulateSqon';

type OutputElement = {
    operation: string;
    count: number;
};

type Output = {
    summary: OutputElement[];
    operations: OutputElement[];
};

const builder = SQONBuilder;

const setFormulasDuo = (s1: v3SQON, s2: v3SQON) =>
    [
        {
            operation: 'Q₁',
            sqon: builder.from(s1),
        },
        {
            operation: 'Q₂',
            sqon: builder.from(s2),
        },
        {
            operation: 'Q₁-Q₂',
            sqon: builder.from(s1).not(builder.from(s2)),
        },
        {
            operation: 'Q₂-Q₁',
            sqon: builder.from(s2).not(builder.from(s1)),
        },
        {
            operation: 'Q₁∩Q₂',
            sqon: builder.and([s1, s2]),
        },
    ].map(x => ({ ...x, sqon: renameFieldNameToField(x.sqon) }));

const setFormulasTrio = (s1: v3SQON, s2: v3SQON, s3: v3SQON) =>
    [
        {
            operation: 'Q₁',
            sqon: builder.from(s1),
        },
        {
            operation: 'Q₂',
            sqon: builder.from(s2),
        },
        {
            operation: 'Q₃',
            sqon: builder.from(s3),
        },
        {
            operation: 'Q₁-(Q₂∩Q₃)',
            sqon: builder.from(s1).not(builder.and([s2, s3])),
        },
        {
            operation: 'Q₂-(Q₁∩Q₃)',
            sqon: builder.from(s2).not(builder.and([s1, s3])),
        },
        {
            operation: 'Q₃-(Q₁∩Q₂)',
            sqon: builder.from(s3).not(builder.and([s1, s2])),
        },
        {
            operation: '(Q₁∩Q₂)-Q₃',
            sqon: builder.and([s1, s2]).not(s3),
        },
        {
            operation: '(Q₂∩Q₃)-Q₁',
            sqon: builder.and([s2, s3]).not(s1),
        },
        {
            operation: '(Q₁∩Q₃)-Q₂',
            sqon: builder.and([s1, s3]).not(s2),
        },
        {
            operation: 'Q₁∩Q₂∩Q₃',
            sqon: builder.and([s1, s2, s3]),
        },
    ].map(x => ({ ...x, sqon: renameFieldNameToField(x.sqon) }));

let nestedFields: string[] = null;

export const venn = async (sqons: string[]): Promise<Output> => {
    // (Arranger v2 vs v3): SqonBuilder uses property "fieldName" (v3) but we use "field" (v2)
    const v3Sqons: v3SQON[] = sqons.map(s => renameFieldToFieldName(s));

    const setFormulas =
        sqons.length === 2
            ? setFormulasDuo(v3Sqons[0], v3Sqons[1])
            : setFormulasTrio(v3Sqons[0], v3Sqons[1], v3Sqons[2]);

    const client = EsInstance.getInstance();
    const needToFetchMapping = !nestedFields || nestedFields.length === 0;
    if (needToFetchMapping) {
        nestedFields = await getNestedFieldsForIndex(client, 'participant_centric');
    }

    const mSearchBody = setFormulas
        .map(x => [
            {},
            {
                track_total_hits: true,
                size: 0,
                query: buildQuery({
                    nestedFields: nestedFields,
                    filters: x.sqon,
                }),
            },
        ])
        .flat();

    const r = await client.msearch({
        body: mSearchBody,
    });

    const responses = r.body?.responses || [];

    const data = setFormulas.map((x, i) => ({
        ...x,
        count: responses[i].hits.total.value,
    }));

    // Reformat for UI
    return data.reduce(
        (xs: Output, x: OutputElement) => {
            if (['Q₁', 'Q₂', 'Q₃'].some(y => y === x.operation)) {
                return { ...xs, summary: [...xs.summary, x] };
            }
            return { ...xs, operations: [...xs.operations, x] };
        },
        { summary: [], operations: [] },
    );
};
