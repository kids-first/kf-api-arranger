export type SearchBucket = {
    key: string;
    acls: { buckets: { key: string }[] };
    top_study_hits: { hits: { hits: { _source: { study: { study_name: string; study_code: string } } }[] } };
    doc_count: number;
};

export type StudyDataSpecific = {
    study_id: string;
    user_acl_in_study: string[];
    title: string;
    authorized_controlled_files_count: number;
};

export type StudyDataGlobal = {
    total_files_count: number;
    total_authorized_files_count: number;
};

export type AuthStudiesData = (StudyDataSpecific | StudyDataGlobal)[];

export type ResponseResult = {
    [k: string]: {
        data: AuthStudiesData;
        error: boolean;
    };
};

export type FileAccessCountsResponse = {
    hits: { total: { value: number } };
    status: number;
    _shards: {
        total: number;
        successful: number;
        skipped: number;
        failed: number;
        failures: {
            shard: number;
            index: string;
            node: string;
            reason: {
                reason: string;
                index: string;
                index_uuid: string;
                caused_by: {
                    type: string;
                    reason: string;
                };
            };
        }[];
    };
};
