import { SetSqon } from '../sets/setsTypes';

export type SourceType = {
    query: string;
    getSqon: (ids: string[]) => SetSqon;
    transform: (data: unknown, ids: string[]) => SearchByIdsResult[];
};

export type SearchByIdsResult = {
    search: string;
    type: string;
    participantIds: string[];
};
