import type { CreateUpdateBody, SetIdToTag, SetSqon, Sort } from '../endpoints/sets/setsTypes.js';
import { userApiURL } from '../env.js';
import { UserApiError } from './userApiError.js';

export type UserSetContent = {
    setType: string;
    riffType: string;
    ids: string[];
    sqon: SetSqon;
    sort: Sort[];
    idField: string;
};

export type UserSet = {
    id: string;
    keycloak_id: string;
    content: UserSetContent;
    alias: string;
    sharedpublicly: boolean;
    creation_date: Date;
    updated_date: Date;
    is_invisible?: boolean;
};

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const callUserApi = async <T>(path: string, method: Method, accessToken: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${userApiURL}${path}`, {
        method,
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    const responseBody = (await response.json()) as T;

    if (response.ok) {
        return responseBody;
    }

    throw new UserApiError(response.status, responseBody);
};

export const getSharedSet = (accessToken: string, setId: string): Promise<UserSet> =>
    callUserApi<UserSet>(`/user-sets/shared/${encodeURIComponent(setId)}`, 'GET', accessToken);

export const getUserSets = (accessToken: string): Promise<UserSet[]> =>
    callUserApi<UserSet[]>('/user-sets', 'GET', accessToken);

export const postUserSet = (accessToken: string, set: CreateUpdateBody): Promise<UserSet> =>
    callUserApi<UserSet>('/user-sets', 'POST', accessToken, set);

export const putUserSet = (accessToken: string, set: CreateUpdateBody, setId: string): Promise<UserSet> =>
    callUserApi<UserSet>(`/user-sets/${encodeURIComponent(setId)}`, 'PUT', accessToken, set);

export const deleteUserSet = async (accessToken: string, setId: string): Promise<string> => {
    await callUserApi<unknown>(`/user-sets/${encodeURIComponent(setId)}`, 'DELETE', accessToken);
    return setId;
};

export const postSetsTags = (setIds: string[], accessToken: string): Promise<SetIdToTag[]> =>
    callUserApi<SetIdToTag[]>('/user-sets/aliases', 'POST', accessToken, { setIds });
