export type SetSqon = {
    op: string;
    content: any; // Since SQON is generic, it is too complex to define an explicit type for its content.
};

export const RIFF_TYPE_SET = 'set';

export type CreateUpdateBody = {
    alias: string;
    content: Content;
    sharedPublicly: boolean;
};

export type Content = {
    setType: string;
    riffType: string;
    ids: string[];
    sqon: SetSqon;
    sort: Sort[];
    idField: string;
};

export type CreateSetBody = {
    projectId: string;
    type: string;
    sqon: SetSqon;
    idField: string;
    sort: Sort[];
    tag: string;
};

export type UpdateSetTagBody = {
    subAction: string;
    sourceType: string;
    newTag: string;
};

export type UpdateSetContentBody = {
    subAction: string;
    sourceType: string;
    sqon: SetSqon;
    projectId: string;
};

export type Sort = {
    field: string;
    order: string;
};

export type Set = {
    id: string;
    tag: string;
    size: number;
    setType: string;
    updated_date: Date;
    created_date: Date;
};
