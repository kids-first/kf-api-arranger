import { buildQuery } from '@arranger/middleware';

import EsInstance from '../../ElasticSearchClientInstance';
import { getNestedFieldsForIndex } from '../../sqon/getNestedFieldsForIndex';
import { and, not } from '../../sqon/manipulateSqon';
import { Sqon } from '../../sqon/types';

type Output = {
    operation: string;
    count: number;
    sqon: Sqon;
};

type OutputReformattedElement = Output & {
    setId?: string;
};

type OutputReformatted = {
    summary: OutputReformattedElement[];
    operations: OutputReformattedElement[];
};

const setFormulasDuo = (s1: Sqon, s2: Sqon) => [
    {
        operation: 'Q₁',
        sqon: s1,
    },
    {
        operation: 'Q₂',
        sqon: s2,
    },
    {
        operation: 'Q₁-Q₂',
        sqon: not(s1, s2),
    },
    {
        operation: 'Q₂-Q₁',
        sqon: not(s2, s1),
    },
    {
        operation: 'Q₁∩Q₂',
        sqon: and(s1, [s2]),
    },
];

const setFormulasTrio = (s1: Sqon, s2: Sqon, s3: Sqon) => [
    {
        operation: 'Q₁',
        sqon: s1,
    },
    {
        operation: 'Q₂',
        sqon: s2,
    },
    {
        operation: 'Q₃',
        sqon: s3,
    },
    {
        operation: 'Q₁-(Q₂∩Q₃)',
        sqon: not(s1, and(s2, [s3])),
    },
    {
        operation: 'Q₂-(Q₁∩Q₃)',
        sqon: not(s2, and(s1, [s3])),
    },
    {
        operation: 'Q₃-(Q₁∩Q₂)',
        sqon: not(s3, and(s1, [s2])),
    },
    {
        operation: '(Q₁∩Q₂)-Q₃',
        sqon: not(and(s1, [s2]), s3),
    },
    {
        operation: '(Q₂∩Q₃)-Q₁',
        sqon: not(and(s2, [s3]), s1),
    },
    {
        operation: '(Q₁∩Q₃)-Q₂',
        sqon: not(and(s1, [s3]), s2),
    },
    {
        operation: 'Q₁∩Q₂∩Q₃',
        sqon: and(s1, [s2, s3]),
    },
];

let nestedFields: string[] = null;

export const venn = async (sqons: Sqon[]): Promise<Output[]> => {
    const setFormulas =
        sqons.length === 2 ? setFormulasDuo(sqons[0], sqons[1]) : setFormulasTrio(sqons[0], sqons[1], sqons[2]);

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

    return setFormulas.map((x, i) => ({
        ...x,
        count: responses[i].hits.total.value,
    }));
};

export const reformatVenn = (data: Output[]): OutputReformatted => {
    const tables = data.reduce(
        (xs: OutputReformatted, x: OutputReformattedElement) => {
            if (['Q₁', 'Q₂', 'Q₃'].some(y => y === x.operation)) {
                return { ...xs, summary: [...xs.summary, x] };
            }
            return { ...xs, operations: [...xs.operations, x] };
        },
        { summary: [], operations: [] },
    );

    return {
        summary: tables.summary,
        operations: tables.operations.map((x: Output, i: number) => ({ ...x, setId: `set-${i}` })),
    };
};
