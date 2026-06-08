export type SetSqon = {
    op: string;
    content: any; // Since SQON is generic, it is too complex to define an explicit type for its content.
};

export const RIFF_TYPE_SET = 'set';

export type CreateUpdateBody = {
    alias: string;
    content: Content;
    sharedPublicly: boolean;
    is_invisible?: boolean;
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
    type: string;
    sqon: SetSqon;
    idField: string;
    sort: Sort[];
    tag: string;
    is_invisible?: boolean;
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
};

export type Sort = {
    field: string;
    order: string;
};

export type SavedSet = {
    id: string;
    tag: string;
    size: number;
    setType: string;
    // ISO-8601 strings forwarded straight from UserApi (see UserSet) — not Dates.
    updated_date: string;
    created_date: string;
    is_invisible: boolean;
};

export type SetIdToTag = {
    setId: string;
    alias: string;
};
