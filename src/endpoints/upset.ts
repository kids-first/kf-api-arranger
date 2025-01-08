import { getNestedFields } from '@arranger/mapping-utils';
import { buildQuery } from '@arranger/middleware';

import EsInstance from '../ElasticSearchClientInstance';

export type UpsetData = {
    name: string;
    elems: string[];
}[];

export const countIt = (xs: string[]): Map<string, number> => {
    const m = new Map();
    for (const x of xs) {
        m.set(x, m.has(x) ? m.get(x) + 1 : 1);
    }
    // Sorted by descending order
    return new Map([...m.entries()].sort((a, b) => b[1] - a[1]));
};

export const topN = (m: Map<string, number>, n: number): string[] => [...m.keys()].slice(0, n);

const sqonPlusDownClause = sqon => ({
    content: [
        sqon,
        {
            content: {
                field: 'down_syndrome_status',
                index: 'participant',
                value: ['T21'],
            },
            op: 'in',
        },
    ],
    op: 'and',
});

const BATCH_SIZE = 500;
export const buildSteps = (maxElements = 10000, batchSize: number = BATCH_SIZE) =>
    [...Array(Math.ceil(maxElements / batchSize)).keys()].map(x => ({
        from: x === 0 ? x : x * batchSize,
        size: batchSize,
    }));

let nestedFields: string[] = null;

const emptySQON = {
    op: 'and',
    content: [],
};

const TOP = 20;
export const computeUpset = async (
    sqon = emptySQON,
): Promise<{
    data: UpsetData;
    participantsCount: number;
}> => {
    const client = EsInstance.getInstance();

    const needToFetchMapping = !nestedFields || nestedFields.length === 0;
    if (needToFetchMapping) {
        const rM = await client.indices.getMapping({ index: 'participant_centric' });
        nestedFields = getNestedFields(Object.values(rM.body || {})[0]?.mappings?.properties);
    }

    // assumption: unique participants
    const searchBody = {
        query: buildQuery({ nestedFields, filters: sqonPlusDownClause(sqon) }),
        _source: ['fhir_id', 'phenotype.hpo_phenotype_observed'],
        sort: [
            {
                fhir_id: {
                    order: 'asc',
                },
            },
        ],
    };

    let hits = [];
    for (const step of buildSteps()) {
        const { body } = await client.search({
            index: 'participant_centric',
            from: step.from,
            size: step.size,
            body: searchBody,
        });

        hits = [
            ...hits,
            ...body.hits.hits.map(
                (x: { _source: { fhir_id: string; phenotype: { hpo_phenotype_observed: string }[] } }) => x._source,
            ),
        ];

        const hasNext: boolean = body.hits.total.value >= step.from + BATCH_SIZE;
        if (!hasNext) {
            break;
        }
    }

    const ps: { patient: string; ph: string[] }[] = hits
        .filter(x => !!x.phenotype)
        .map((x: { fhir_id: string; phenotype: { hpo_phenotype_observed: string }[] }) => ({
            patient: x.fhir_id,
            ph: [...new Set(x.phenotype.map(p => p.hpo_phenotype_observed))],
        }));

    const allQueryPhenotypes: string[] = ps.map(x => x.ph).flat();

    //countIt is sorted by descending counts
    const top = topN(countIt(allQueryPhenotypes), TOP);

    const data = top.map(x => {
        const pts = ps.reduce((ys, y) => (y.ph.includes(x) ? [...ys, y.patient] : ys), []);
        return {
            name: x,
            elems: pts,
        };
    });

    return {
        data,
        participantsCount: hits.length,
    };
};
