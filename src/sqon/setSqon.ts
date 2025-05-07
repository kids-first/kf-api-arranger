import { participantBiospecimenKey, participantFileKey, participantKey } from '../fieldsKeys';
import { getUserSets } from '../userApi/userApiClient';
import { Content, Sqon } from './types';

const getPathToParticipantId = (type: string) => {
    if (type === 'biospecimen') {
        return participantBiospecimenKey;
    } else if (type === 'file') {
        return participantFileKey;
    } else {
        return participantKey;
    }
};

export const resolveSetIds = async (sqon: Sqon, accessToken: string): Promise<Sqon> => {
    if (!sqon || typeof sqon !== 'object') {
        throw new Error('Invalid input: SQON must be a non-null object');
    }

    const traverseWithMutation = (node: Sqon, callback: (content: Content) => Content) => {
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
            node.forEach(item => traverseWithMutation(item, callback));
        } else {
            Object.values(node).forEach(item => traverseWithMutation(item, callback));
        }
    };

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
    traverseWithMutation(clone, collectSetIds);

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
    traverseWithMutation(clone, injectIds);

    return clone;
};
