import { ExecutionResult } from 'graphql/execution/execute';
import { get } from 'lodash';

import { runProjectQuery } from '../arrangerUtils';
import { ArrangerProject } from '../arrangerUtils';
import { throwErrorsFromGqlQueryIfExist } from '../errors';
import { idKey } from '../fieldsKeys';
import { replaceSetByIds } from '../sqon/setSqon';
import { SetSqon } from './sets/setsTypes';

const MAX_PHENOTYPES = 100000;

const extractPsIds = (resp): string[] => (resp?.data?.participant?.hits?.edges || []).map(edge => edge.node[idKey]);

const getParticipantIds = async (
    sqon: SetSqon,
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
) => {
    const project = getProject(projectId);
    const runQuery = runProjectQuery(project);

    const countRes: ExecutionResult = await runQuery({
        query: `query getParticipantCount($sqon: JSON) {
          participant {
            hits(filters: $sqon) {
              total
            }
          }
        }
        `,
        variables: { sqon },
    });
    const psCount = countRes?.data?.participant?.hits?.total ?? 0;
    if (psCount === 0) {
        return [];
    }
    const batchSize = 5000;
    const gqlVariables = { sqon, sort: [{ field: idKey, order: 'asc' }], first: batchSize };
    const psResp = await runQuery({
        query: `
            query ($sqon: JSON, $sort: [Sort], $first: Int) {
                participant {
                    hits(filters: $sqon, sort: $sort, first: $first) {
                        edges {
                            node {
                                ${idKey}
                            }
                        }
                    }
                }
            }
        `,
        variables: gqlVariables,
    });

    throwErrorsFromGqlQueryIfExist(psResp);

    const state = { searchAfter: [], ids: extractPsIds(psResp) };
    const nOfBatches = Math.ceil(psCount / batchSize);
    const remainingNOfBatches = nOfBatches - 1; //subtract 1 since first batch has been consumed already
    const it = Array(remainingNOfBatches).keys();
    let x = it.next();
    while (!x.done) {
        const lastFetchedId = state.ids.slice(-1);
        const psResp = await runQuery({
            query: `
            query ($sqon: JSON, $sort: [Sort], $first: Int, $searchAfter: JSON) {
                participant {
                    hits(filters: $sqon, sort: $sort, first: $first, searchAfter: $searchAfter) {
                        edges {
                         searchAfter
                            node {
                                ${idKey}
                            }
                        }
                    }
                }
            }
        `,
            variables: { ...gqlVariables, searchAfter: lastFetchedId },
        });

        throwErrorsFromGqlQueryIfExist(psResp);

        state.ids = [...state.ids, ...extractPsIds(psResp)];
        x = it.next();
    }

    if (psCount !== state.ids.length) {
        const duplicateDetected = new Set(state.ids).size !== state.ids.length;
        throw new Error(
            `Participants count differs from the number of retrieve ids. Got ${psCount} for count but got ${
                state.ids.length
            } for the number of retrieved ids. ${duplicateDetected ? 'Besides, duplicates were detected.' : ''}`,
        );
    }
    return state.ids;
};

export const getPhenotypesNodes = async (
    sqon: SetSqon,
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
    type: string,
    aggregations_filter_themselves: boolean,
    accessToken: string,
) => {
    const newSqon = await replaceSetByIds(sqon, accessToken);

    const participantIds = await getParticipantIds(newSqon as SetSqon, projectId, getProject);

    return getPhenotypesNodesByIds(participantIds, projectId, getProject, type, aggregations_filter_themselves);
};

const getPhenotypesNodesByIds = async (
    ids: string[],
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
    type: string,
    aggregations_filter_themselves: boolean,
) => {
    const query = `query($sqon: JSON, $term_filters: JSON) {
          participant {
            aggregations(filters: $sqon, aggregations_filter_themselves: ${aggregations_filter_themselves}) {
              ${type}__name {
                buckets {
                  key
                  doc_count
                  top_hits(_source: ["${type}.parents"], size: 1)
                  filter_by_term(filter: $term_filters)
                }
              }
            }
          }
        }`;

    const sqon = {
        content: [
            {
                content: {
                    field: idKey,
                    value: ids,
                    index: 'participant',
                },
                op: 'in',
            },
        ],
        op: 'and',
    };

    const termFilter = {
        op: 'and',
        content: [
            {
                op: 'in',
                content: {
                    field: `${type}.is_tagged`,
                    value: [true],
                },
            },
        ],
    };

    const project = getProject(projectId);
    if (!project) {
        throw new Error(`ProjectID '${projectId}' cannot be established.`);
    }

    const res = await project.runQuery({
        query,
        variables: { sqon, term_filters: termFilter, size: MAX_PHENOTYPES, offset: 0 },
    });
    return get(res, `data.participant.aggregations.${type}__name.buckets`, []);
};
