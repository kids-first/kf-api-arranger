import fetch from 'node-fetch';

import { userApiURL } from '../env';
import { UserApiError } from './userApiError';
import { CreateUpdateBody, Output } from '../riff/riffClient';

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

export const postUserContent = async (accessToken: string, set: CreateUpdateBody): Promise<Output> => {
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

export const putUserContent = async (accessToken: string, set: CreateUpdateBody, setId: string): Promise<Output> => {
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

export const deleteUserContent = async (accessToken: string, setId: string): Promise<boolean> => {
    const uri = `${userApiURL}/user-sets/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'delete',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 200) {
        return true;
    }

    throw new UserApiError(response.status, response.body);
};
