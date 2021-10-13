import { flatten } from 'lodash';

import { ArrangerProject } from '../../sqon/searchSqon';
import { byBiospecimenId } from './byBiospecimenId';
import { byFamilyId } from './byFamilyId';
import { byId } from './byId';
import { bySampleExternalId } from './bySampleExternalId';
import executePagedQuery from './executePagedQuery';
import { SearchByIdsResult, SourceType } from './searchByIdsTypes';

const searchSources = (sources: SourceType[]) => async (
    ids: string[],
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
) => {
    const project = getProject(projectId);
    if (!project) {
        throw new Error(`ProjectID '${projectId}' cannot be established.`);
    }

    const promises = sources.map(src => {
        const sqon = src.getSqon(ids);
        // get the data for this source
        return (
            executePagedQuery(project, src.query, sqon)
                // transform normalized data to a "query result"
                .then((results: unknown) => src.transform(results, ids))
                // remove results without participants (id not found in this source)
                .then((results: SearchByIdsResult[]) => results.filter(result => result.participantIds.length))
        );
    });

    return await Promise.all(promises).then(flatten);
};

export const searchAllSources: (
    ids: string[],
    projectId: string,
    getProject: (projectId: string) => ArrangerProject,
) => Promise<SearchByIdsResult[]> = searchSources([byId, byBiospecimenId, byFamilyId, bySampleExternalId]);
