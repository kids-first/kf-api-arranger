import fetch from 'node-fetch';

import { SetSqon, Sort } from '../endpoints/sets/setsTypes';
import { userApiURL } from '../env';
import { UserApiError } from './userApiError';

export type Content = {
    setType: string;
    ids: string[];
    sqon: SetSqon;
    sort: Sort[];
    idField: string;
};

export type Output = {
    id: string;
    keycloak_id: string;
    content: Content;
    alias: string;
    sharedpublicly: boolean;
    creation_date: Date;
    updated_date: Date;
};

export const getSharedSet = async (accessToken: string, setId: string): Promise<Output> => {
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

export const getUserContents = async (accessToken: string): Promise<Output[]> => {
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

export const postUserContent = async (accessToken: string, set): Promise<Output> => {
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

export const putUserContent = async (accessToken: string, set, setId: string): Promise<Output> => {
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

export const deleteUserContent = async (accessToken: string, setId: string): Promise<string> => {
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
