import { idKey } from '../env';
import { ArrangerProject, searchSqon } from '../sqon/searchSqon';
import { SetSqon } from './sets/setsTypes';
import { get } from 'lodash';
import { replaceSetByIds } from '../sqon/setSqon';

const MAX_PHENOTYPES = 100000;

const getParticipantIds = async (
    sqon: SetSqon,
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
) => {
    return await searchSqon(sqon, projectId, 'participant', [], idKey, getProject);
};

export const getPhenotypesNodes = async (
    sqon: SetSqon,
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
    type: string,
    aggregations_filter_themselves: boolean,
    accessToken: string,
    userId: string,
) => {
    const newSqon = await replaceSetByIds(sqon, accessToken, userId);

    const participantIds = await getParticipantIds(newSqon as SetSqon, projectId, getProject);

    return await getPhenotypesNodesByIds(participantIds, projectId, getProject, type, aggregations_filter_themselves);
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
