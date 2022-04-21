import { idKey } from '../env';
import { ArrangerProject, searchSqon } from '../sqon/searchSqon';
import { SetSqon } from './sets/setsTypes';
import { get } from 'lodash';

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
) => {
    const participantIds = await getParticipantIds(sqon, projectId, getProject);

    return await getPhenotypesNodesByIds(participantIds, projectId, getProject, type);
};

const getPhenotypesNodesByIds = async (
    ids: string[],
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
    type: string,
) => {
    const query = `query($sqon: JSON) {
          participant {
            aggregations(filters: $sqon, aggregations_filter_themselves: true) {
              ${type}__name {
                buckets {
                  key
                  doc_count
                  top_hits(_source: ["${type}.parents"], size: 1)
                }
              }
            }
          }
        }`;

    const sqon = {
        content: [
            {
                content: {
                    field: 'fhir_id',
                    value: ids,
                    index: 'participant',
                },
                op: 'in',
            },
        ],
        op: 'and',
    };

    const project = getProject(projectId);
    if (!project) {
        throw new Error(`ProjectID '${projectId}' cannot be established.`);
    }

    const res = await project.runQuery({
        query,
        variables: { sqon, size: 20000, offset: 0 },
    });
    return get(res, `data.participant.aggregations.${type}__name.buckets`, []);
};
