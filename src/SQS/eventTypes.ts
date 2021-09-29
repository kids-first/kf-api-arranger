import { SetSqon } from '../endpoints/sets/setsTypes';

export type EventCreate = {
    actionType: string;
    values: EventCreateValue;
};

export type EventCreateValue = {
    setId: string;
    createdAt: Date;
    ids: string[];
    size: number;
    sqon: SetSqon;
    type: string;
    userId: string;
    path: string;
    tag: string;
};

export type EventDelete = {
    actionType: string;
    values: EventDeleteValues;
};

export type EventDeleteValues = {
    userId: string;
    setIds: string[];
};

export type EventUpdate = {
    actionType: string;
    subActionType: string;
    values: UpdateTagValue | UpdateContentValue;
};

export type UpdateTagValue = {
    userId: string;
    setId: string;
    newTag: string;
};

export type UpdateContentValue = {
    userId: string;
    ids: string[];
    setId: string;
    createdAt: Date;
    tag: string;
};
