import fetch from 'node-fetch';

import { riffURL } from '../env';
import { RiffError } from './riffError';

export type CreateUpdateRiffBody = {
    alias: string;
    content: RiffContent;
    sharedPublicly: boolean;
};

export type RiffContent = {
    type: string;
    participantIds: string[];
    sqon: JSON;
};

export type Riff = {
    id: string;
    uid: string;
    content: RiffContent;
    alias: string;
    sharedPublicly: boolean;
    creationDate: Date;
    updatedDate: Date;
};

export const getRiffs = async (accessToken: string, userId: string): Promise<Riff[]> => {
    const uri = `${riffURL}/riff/user/${userId}`;

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

    throw new RiffError(response.status, body);
};

export const postRiff = async (accessToken: string, set: CreateUpdateRiffBody): Promise<Riff> => {
    const uri = `${riffURL}/riff/shorten`;

    const response = await fetch(encodeURI(uri), {
        method: 'post',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(set),
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new RiffError(response.status, body);
};

export const putRiff = async (accessToken: string, set: CreateUpdateRiffBody, setId: string): Promise<Riff> => {
    const uri = `${riffURL}/riff/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'put',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(set),
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new RiffError(response.status, body);
};

export const deleteRiff = async (accessToken: string, setId: string): Promise<boolean> => {
    const uri = `${riffURL}/riff/${setId}`;

    const response = await fetch(encodeURI(uri), {
        method: 'delete',
        headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
        },
    });

    const body = await response.json();

    if (response.status === 200) {
        return body;
    }

    throw new RiffError(response.status, body);
};
