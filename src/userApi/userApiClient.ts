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
    // JSON has no Date type: UserApi sends these as ISO-8601 strings and that is
    // what response.json() yields. They are only ever forwarded, never used as Dates.
    creation_date: string;
    updated_date: string;
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

    // Read the raw body once. Not every endpoint returns JSON — e.g. DELETE
    // /user-sets/:id replies with the bare set id as text/html — and a 204 has
    // no body at all. Parsing unconditionally with response.json() throws on
    // those, so parse only when there is content that actually parses and keep
    // the raw text otherwise.
    const text = await response.text();
    let responseBody: unknown = text;
    if (text) {
        try {
            responseBody = JSON.parse(text);
        } catch {
            // Non-JSON body (e.g. DELETE returns the bare id) — keep raw text.
        }
    }

    if (response.ok) {
        return responseBody as T;
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
