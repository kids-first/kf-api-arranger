import fetch from 'node-fetch';

import { CreateUpdateBody, SetIdToTag, SetSqon, Sort } from '../endpoints/sets/setsTypes';
import { userApiURL } from '../env';
import { UserApiError } from './userApiError';

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

export const getSharedSet = async (accessToken: string, setId: string): Promise<UserSet> => {
    const uri = `${userApiURL}/user-sets/shared/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'get',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new UserApiError(response.status, body);
};

export const getUserSets = async (accessToken: string): Promise<UserSet[]> => {
    const uri = `${userApiURL}/user-sets`;

    const response = await fetch(encodeURI(uri), {
        method: 'get',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new UserApiError(response.status, body);
};

export const postUserSet = async (accessToken: string, set: CreateUpdateBody): Promise<UserSet> => {
    const uri = `${userApiURL}/user-sets`;

    const response = await fetch(encodeURI(uri), {
        method: 'post',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(set),
    });

    const body = await response.json();

    if (response.status < 300) {
        return body;
    }

    throw new UserApiError(response.status, body);
};

export const putUserSet = async (accessToken: string, set: CreateUpdateBody, setId: string): Promise<UserSet> => {
    const uri = `${userApiURL}/user-sets/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'put',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(set),
    });

    const body = await response.json();

    if (response.status < 300) {
        return body;
    }

    throw new UserApiError(response.status, body);
};

export const deleteUserSet = async (accessToken: string, setId: string): Promise<string> => {
    const uri = `${userApiURL}/user-sets/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'delete',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 200) {
        return setId;
    }

    throw new UserApiError(response.status, response.body);
};

export const postSetsTags = async (setIds: string[], accessToken: string): Promise<SetIdToTag[]> => {
    const uri = `${userApiURL}/user-sets/aliases`;

    const response = await fetch(encodeURI(uri), {
        method: 'post',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: `"setIds": ${JSON.stringify(setIds)}`,
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new UserApiError(response.status, body);
};
