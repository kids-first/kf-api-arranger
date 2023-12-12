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
    userAclForFence: string[],
): Promise<{ data: AuthStudiesData }> => {
    const buckets: SearchBucket[] = await searchAggregatedAuthorizedStudiesForFence(client, fence, userAclForFence);
    if (buckets.length === 0) {
        return {
            data: [],
        };
    }

    const dataAggregations: StudyDataSpecific[] = buckets.map((b: SearchBucket) => ({
        study_id: b.key,
        // Filtering out study files acls that are not included in the user's acls.
        // It Would be better to do the filtering in the query itself, but it is simpler here.
        user_acl_in_study: b.acls.buckets.filter(b => userAclForFence.includes(b.key)).map(b => b.key),
        study_code: b.top_study_hits.hits.hits[0]._source.study.study_code,
        title: b.top_study_hits.hits.hits[0]._source.study.study_name,
        authorized_controlled_files_count: b.doc_count,
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
                total_files_count: extractMSearchHitsTotal(M_SEARCH.indexOfTotalNOfFiles),
                total_controlled_files_count: extractMSearchHitsTotal(M_SEARCH.indexOfControlledNOfFiles),
                total_uncontrolled_files_count: extractMSearchHitsTotal(M_SEARCH.indexOfRegisteredNOfFiles),
            };
        }),
    };
};

export const computeAuthorizedStudiesForAllFences = async (req: Request, res: Response): Promise<Response> => {
    const body: {
        gen3: {
            acl: string[];
        };
        dcf: {
            acl: string[];
        };
    } = req.body;

    //===== INPUT Validations
    const fences = Object.keys(body);
    const fencesAreProcessable =
        Array.isArray(fences) && fences.length > 0 && fences.every(f => SUPPORTED_FENCES.includes(f));
    if (!fencesAreProcessable) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).send('Unsupported Fence(s) format or value');
    }

    const MAX_ACL_SIZE = 500;
    const aclAreProcessable = Object.values(body).every(x => Array.isArray(x.acl) && x.acl.length <= MAX_ACL_SIZE);
    if (!aclAreProcessable) {
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .send(`Acls must be a list for each fence and not exceed a certain size`);
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
            const { data } = await computeAuthorizedStudiesForFence(client, fence, body[fence].acl);
            state[fence] = {
                ...state[fence],
                data,
            };
        } catch (e) {
            console.error(`Authorized-Studies (${computeAuthorizedStudiesForFence.name}):\n`, e);
            state[fence] = {
                ...state[fence],
                error: true,
            };
        }
    }

    return res.send(state);
};
