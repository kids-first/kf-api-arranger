// In-memory mock ES client for slice S step D.
// Returns 3 hardcoded study hits; ignores query/filters/sort.
// Replaced by the real @elastic/elasticsearch client in step E.

import type { EsClient, EsSearchParams, EsSearchResponse } from './client.js';

type StudySource = {
    study_id: string;
    study_code: string;
    study_name: string;
};

const MOCK_STUDY_HITS: { _id: string; _source: StudySource }[] = [
    { _id: 'SD_001', _source: { study_id: 'SD_001', study_code: 'KF-MOCK-001', study_name: 'Mock Study One' } },
    { _id: 'SD_002', _source: { study_id: 'SD_002', study_code: 'KF-MOCK-002', study_name: 'Mock Study Two' } },
    { _id: 'SD_003', _source: { study_id: 'SD_003', study_code: 'KF-MOCK-003', study_name: 'Mock Study Three' } },
];

export function createMockEsClient(): EsClient {
    return {
        async search<TSource = Record<string, unknown>>(
            params: EsSearchParams,
        ): Promise<EsSearchResponse<TSource>> {
            const size = params.size ?? 10;
            const hits = MOCK_STUDY_HITS.slice(0, size).map(h => ({
                _id: h._id,
                _source: h._source as unknown as TSource,
                sort: [h._id],
            }));
            return {
                hits: {
                    total: { value: MOCK_STUDY_HITS.length, relation: 'eq' },
                    hits,
                },
            };
        },
    };
}
