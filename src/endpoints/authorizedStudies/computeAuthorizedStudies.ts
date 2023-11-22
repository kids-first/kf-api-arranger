import { Client } from '@elastic/elasticsearch';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import EsInstance from '../../ElasticSearchClientInstance';
import { multiSearchFilesAccessCounts, searchAggregatedAuthorizedStudiesForFence } from './searchers';
import { AuthStudiesData, ResponseResult, SearchBucket, StudyDataGlobal, StudyDataSpecific } from './types';

const SUPPORTED_FENCES = ['gen3', 'dcf'];

export const computeAuthorizedStudiesForFence = async (
    client: Client,
    fence: string,
    userAcl: string[],
): Promise<{ data: AuthStudiesData }> => {
    const buckets: SearchBucket[] = await searchAggregatedAuthorizedStudiesForFence(client, fence, userAcl);
    if (buckets.length === 0) {
        return {
            data: [],
        };
    }

    const dataAggregations: StudyDataSpecific[] = buckets.map((b: SearchBucket) => ({
        study_id: b.key,
        user_acl: b.acls.buckets.map(b => b.key),
        title: b.top_study_hits.hits.hits[0]._source.study.study_name,
        authorized_files_count: b.doc_count,
    }));

    const allStudyIds = dataAggregations.map(x => x.study_id);
    const M_SEARCH = {
        indexOfTotalNOfFiles: 0,
        indexOfControlledNOfFiles: 1,
        indexOfRegisteredNOfFiles: 2,
    };

    //Get all files count per candidate study
    const accessCounts = await multiSearchFilesAccessCounts(client, fence, allStudyIds);
    const size = Object.keys(M_SEARCH).length; //there are "size" response elements per study
    // eslint-disable-next-line no-console
    console.assert(
        accessCounts.length % size === 0,
        '`Authorized-Studies: Unexpected chunks size from files counts multi-search',
    );
    return {
        data: dataAggregations.map((x: StudyDataSpecific, i: number): StudyDataSpecific | StudyDataGlobal => {
            const extractMSearchHitsTotal = (index: number) =>
                accessCounts.slice(i * size, i * size + size)[index].hits.total.value;
            return {
                ...x,
                files_count: extractMSearchHitsTotal(M_SEARCH.indexOfTotalNOfFiles),
                controlled_files_count: extractMSearchHitsTotal(M_SEARCH.indexOfControlledNOfFiles),
                uncontrolled_files_count: extractMSearchHitsTotal(M_SEARCH.indexOfRegisteredNOfFiles),
            };
        }),
    };
};

export const computeAuthorizedStudiesForAllFences = async (req: Request, res: Response): Promise<Response> => {
    const { fences, acl: userAcls = [] } = req.body;

    const fencesAreProcessable =
        Array.isArray(fences) && fences.length > 0 && fences.every(f => SUPPORTED_FENCES.includes(f));
    if (!fencesAreProcessable) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).send('Unsupported Fence(s)');
    }

    const MAX_ACL_SIZE = 500;
    const aclAreProcessable = Array.isArray(userAcls) && userAcls.length <= MAX_ACL_SIZE;
    if (!aclAreProcessable) {
        if (userAcls.length > MAX_ACL_SIZE) {
            // eslint-disable-next-line no-console
            console.log(`Authorized-Studies: Acl size from user input exceed the hard limit of: ${MAX_ACL_SIZE}`);
        }
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).send('Acl must be a list');
    }

    const state: ResponseResult = Object.fromEntries(
        Object.entries({
            gen3: {
                data: [],
                error: false,
            },
            dcf: {
                data: [],
                error: false,
            },
        }).filter(([k]) => fences.includes(k)),
    );

    const client = EsInstance.getInstance();
    for (const fence of fences) {
        try {
            const { data } = await computeAuthorizedStudiesForFence(client, fence, userAcls);
            state[fence] = {
                ...state[fence],
                data,
            };
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(`Authorized-Studies:\n`, e);
            state[fence] = {
                ...state[fence],
                error: true,
            };
        }
    }

    return res.send(state);
};
