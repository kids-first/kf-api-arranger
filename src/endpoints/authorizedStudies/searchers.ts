import { Client } from '@elastic/elasticsearch';

import { esFileIndex } from '../../env';
import { FileAccessCountsResponse, SearchBucket } from './types';

const MAX_SIZE_FOR_HITS = 10000;

export const searchAggregatedAuthorizedStudiesForFence = async (
    client: Client,
    fence: string,
    userAcl: string[],
): Promise<SearchBucket[]> => {
    const r = await client.search({
        index: esFileIndex,
        body: {
            size: 0,
            track_total_hits: true,
            query: {
                bool: {
                    must: [
                        {
                            terms: {
                                acl: userAcl,
                            },
                        },
                        {
                            term: {
                                repository: {
                                    value: fence,
                                },
                            },
                        },
                    ],
                },
            },
            aggs: {
                study_ids: {
                    terms: {
                        field: 'study_id',
                        size: MAX_SIZE_FOR_HITS,
                    },
                    aggs: {
                        // Nice to have/do: filter out all the acl values that the user does not have.
                        acls: {
                            terms: {
                                field: 'acl',
                                size: MAX_SIZE_FOR_HITS,
                            },
                        },
                        top_study_hits: {
                            top_hits: {
                                _source: {
                                    includes: ['study.study_name', 'study.study_code'],
                                },
                                //In theory, only one doc suffice to get all the needed information
                                size: 1,
                            },
                        },
                    },
                },
            },
        },
    });
    return r.body?.aggregations?.study_ids.buckets || [];
};

export const multiSearchFilesAccessCounts = async (
    client: Client,
    fence: string,
    studyIds: string[],
): Promise<FileAccessCountsResponse[]> => {
    const { body: bodyMSearch } = await client.msearch({
        body: studyIds
            .map((s: string) => [
                { index: esFileIndex },
                {
                    track_total_hits: true,
                    size: 0,
                    query: {
                        bool: {
                            must: [{ term: { study_id: { value: s } } }, { term: { repository: { value: fence } } }],
                        },
                    },
                },
                { index: esFileIndex },
                {
                    track_total_hits: true,
                    size: 0,
                    query: {
                        bool: {
                            must: [
                                { term: { study_id: { value: s } } },
                                { term: { acl: { value: 'open_access' } } },
                                { term: { repository: { value: fence } } },
                            ],
                        },
                    },
                },
            ])
            .flat(),
    });
    return bodyMSearch.responses || [];
};
