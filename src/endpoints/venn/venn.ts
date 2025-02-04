import { buildQuery } from '@arranger/middleware';

import EsInstance from '../../ElasticSearchClientInstance';
import { getNestedFieldsForIndex } from '../../sqon/getNestedFieldsForIndex';
import { and, not } from '../../sqon/manipulateSqon';
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

type VennParticipantOutput = {
    operation: string;
    sqon: Sqon;
};

type VennOutputReformattedElement = VennEntityOutput &
    VennParticipantOutput & {
        setId?: string;
    };

export type VennOutputReformatted = {
    summary: VennOutputReformattedElement[];
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

const mNestedFields = new Map();

export const venn = async (sqons: Sqon[], index: string, noOpCounts = false): Promise<VennOutput[]> => {
    const setFormulas =
        sqons.length === 2 ? setFormulasDuo(sqons[0], sqons[1]) : setFormulasTrio(sqons[0], sqons[1], sqons[2]);

    // Only Venn formulas in Sqon speak is needed. Counts are not.
    if (noOpCounts) {
        return setFormulas.map(x => ({
            ...x,
            count: undefined,
        }));
    }

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

const reformatWhenUnspecifiedSqon = (os: VennOutput[]): VennParticipantOutput[] =>
    os.map(o => ({
        operation: o.operation,
        sqon: o.sqon,
    }));

const mergeOutputs = (xs: VennEntityOutput[], ys: VennParticipantOutput[]) =>
    // Assumes that lists are of same length as well as "operation" value for same index loop
    xs.map((x, i) => ({ ...x, ...ys[i] }));

const reformatToTables = (data: VennOutputReformattedElement[]): VennOutputReformatted => {
    const tables = data.reduce(
        (xs: VennOutputReformatted, x: VennOutputReformattedElement) => {
            if (['Q₁', 'Q₂', 'Q₃'].some(y => y === x.operation)) {
                return { ...xs, summary: [...xs.summary, x] };
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

export const reformatVenn = (participantOutputs: VennOutput[], entityOutputs: VennOutput[]): VennOutputReformatted =>
    reformatToTables(
        mergeOutputs(reformatWhenSpecifiedEntity(entityOutputs), reformatWhenUnspecifiedSqon(participantOutputs)),
    );
