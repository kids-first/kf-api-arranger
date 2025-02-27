import { buildQuery } from '@arranger/middleware';

import EsInstance from '../../ElasticSearchClientInstance';
import { getNestedFieldsForIndex } from '../../sqon/getNestedFieldsForIndex';
import { and, not, or } from '../../sqon/manipulateSqon';
import { Sqon } from '../../sqon/types';

export type VennOutput = {
    operation: string;
    count: number;
    sqon: Sqon;
};

type VennEntityOutput = {
    operation: string;
    entityCount: number;
    entitySqon: Sqon;
};

type VennOutputReformattedElement = VennEntityOutput & {
    setId?: string;
};

export type VennOutputReformatted = {
    summary: (VennOutputReformattedElement & { qbSqon: Sqon })[];
    operations: VennOutputReformattedElement[];
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
        operation: 'Q₁-(Q₂∪Q₃)',
        sqon: not(s1, or(s2, [s3])),
    },
    {
        operation: 'Q₂-(Q₁∪Q₃)',
        sqon: not(s2, or(s1, [s3])),
    },
    {
        operation: 'Q₃-(Q₁∪Q₂)',
        sqon: not(s3, or(s1, [s2])),
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

const mNestedFields = new Map();

export const venn = async (sqons: Sqon[], index: string): Promise<VennOutput[]> => {
    const setFormulas =
        sqons.length === 2 ? setFormulasDuo(sqons[0], sqons[1]) : setFormulasTrio(sqons[0], sqons[1], sqons[2]);

    const client = EsInstance.getInstance();
    const indexName = `${index}_centric`;
    if (!mNestedFields.has(index)) {
        const fields = await getNestedFieldsForIndex(client, indexName);
        mNestedFields.set(indexName, fields);
    }
    const nestedFields = mNestedFields.get(indexName);

    const mSearchBody = setFormulas
        .map(x => [
            { index: indexName },
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
        count: responses[i]?.hits?.total?.value,
    }));
};

export const reformatWhenSpecifiedEntity = (os: VennOutput[]): VennEntityOutput[] =>
    os.map(o => ({
        operation: o.operation,
        entitySqon: o.sqon,
        entityCount: o.count,
    }));

const reformatToTables = (data: VennOutputReformattedElement[], qbSqons: Sqon[]): VennOutputReformatted => {
    const opToQbSqon = {
        ['Q₁']: qbSqons[0],
        ['Q₂']: qbSqons[1],
        ['Q₃']: qbSqons[2],
    };
    const tables = data.reduce(
        (xs: VennOutputReformatted, x: VennOutputReformattedElement) => {
            if (['Q₁', 'Q₂', 'Q₃'].some(y => y === x.operation)) {
                return { ...xs, summary: [...xs.summary, { ...x, qbSqon: opToQbSqon[x.operation] }] };
            }
            return { ...xs, operations: [...xs.operations, x] };
        },
        { summary: [], operations: [] },
    );

    return {
        summary: tables.summary,
        operations: tables.operations.map((x: VennOutputReformattedElement, i: number) => ({
            ...x,
            setId: `set-${i}`,
        })),
    };
};

export const reformatVenn = (outputs: VennOutput[], qbSqons: Sqon[]): VennOutputReformatted =>
    reformatToTables(reformatWhenSpecifiedEntity(outputs), qbSqons);
