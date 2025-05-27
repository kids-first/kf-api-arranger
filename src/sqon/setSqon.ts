import { participantBiospecimenKey, participantFileKey, participantKey } from '../fieldsKeys';
import { getUserSets, postSetsTags } from '../userApi/userApiClient';
import { Content, Sqon } from './types';
import { SetIdToTag } from '../endpoints/sets/setsTypes';

const getPathToParticipantId = (type: string) => {
    if (type === 'biospecimen') {
        return participantBiospecimenKey;
    } else if (type === 'file') {
        return participantFileKey;
    } else {
        return participantKey;
    }
};

const traverseWithMutationAtSetId = (node: Sqon, callback: (content: Content) => Content) => {
    if (!node || typeof node !== 'object') return;

    // assumes that the format is always: { field: ..., value: ['set_id:...'], ...}
    if (
        node.content &&
        Array.isArray(node.content.value) &&
        typeof node.content.value[0] === 'string' &&
        node.content.value[0].startsWith('set_id:')
    ) {
        node.content = callback(node.content);
    }

    if (Array.isArray(node)) {
        node.forEach(item => traverseWithMutationAtSetId(item, callback));
    } else {
        Object.values(node).forEach(item => traverseWithMutationAtSetId(item, callback));
    }
};

export const resolveQueriesSetAliases = async (sqons: Sqon[], accessToken: string): Promise<SetIdToTag[]> => {
    const sqonsWithSets: Sqon[] = sqons.filter(s => s && JSON.stringify(s).includes('set_id'));

    const setIds: Set<string> = new Set();

    const collectSetIds = (content: Content): Content => {
        setIds.add(content.value[0].replace('set_id:', ''));
        return content;
    };

    for (const s of sqonsWithSets) {
        traverseWithMutationAtSetId(s, collectSetIds);
    }

    if (setIds.size === 0) {
        return [];
    } else {
        return await postSetsTags([...setIds], accessToken);
    }
};

export const resolveSetIds = async (sqon: Sqon, accessToken: string): Promise<Sqon> => {
    if (!sqon || typeof sqon !== 'object') {
        throw new Error('Invalid input: SQON must be a non-null object');
    }

    const sqonStr = JSON.stringify(sqon);
    const hasSetIds = sqonStr.includes('set_id:');
    if (!hasSetIds) {
        return sqon;
    }

    const clone = JSON.parse(sqonStr);

    const setIds: Set<string> = new Set();
    const collectSetIds = (content: Content): Content => {
        setIds.add(content.value[0].replace('set_id:', ''));
        return content;
    };

    traverseWithMutationAtSetId(clone, collectSetIds);

    const userSets = await getUserSets(accessToken);

    const setToIds: Map<string, string[]> = new Map(
        userSets.filter(x => setIds.has(x.id)).map(x => [`set_id:${x.id}`, x.content.ids]),
    );

    const injectIds = (content: Content): Content => {
        const setId = content.value[0];
        const ids = setToIds.get(setId);
        return {
            ...content,
            value: [...ids],
            field: getPathToParticipantId(content.field),
        };
    };
    traverseWithMutationAtSetId(clone, injectIds);

    return clone;
};
