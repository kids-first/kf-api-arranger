export type SearchBucket = {
    key: string;
    acls: { buckets: { key: string }[] };
    top_study_hits: { hits: { hits: { _source: { study: { study_name: string } } }[] } };
    doc_count: number;
};

export type StudyDataSpecific = {
    study_id: string;
    user_acl: string[];
    title: string;
    authorized_files_count: number;
};

export type StudyDataGlobal = {
    files_count: number;
    controlled_files_count: number;
    uncontrolled_files_count: number;
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
};
