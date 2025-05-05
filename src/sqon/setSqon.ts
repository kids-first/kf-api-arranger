import { getUserSet } from '../endpoints/sets/setsFeature';
import { SetSqon } from '../endpoints/sets/setsTypes';
import { participantBiospecimenKey, participantFileKey, participantKey } from '../fieldsKeys';
import { getUserSets } from '../userApi/userApiClient';
import { Content, Sqon } from './types';

const setRegex = /^set_id:(.+)$/gm;

const getPathToParticipantId = (type: string) => {
    if (type === 'biospecimen') {
        return participantBiospecimenKey;
    } else if (type === 'file') {
        return participantFileKey;
    } else {
        return participantKey;
    }
};

const CAPTURING_GROUP_OF_SET_ID_VALUE = 1;
/** @deprecated - Sometimes it "removes" important entries */
export const replaceSetByIds = async (sqon: SetSqon, accessToken: string): Promise<SetSqon> => {
    if (!sqon) {
        throw new Error('Sqon is missing');
    }
    const contents = [];

    for (const content of sqon.content) {
        const handleContent = async content => {
            const matchesSet = setRegex.exec(content?.content?.value?.[0]);
            const setId: string | null = matchesSet && matchesSet[CAPTURING_GROUP_OF_SET_ID_VALUE];
            if (setId) {
                const set = await getUserSet(accessToken, setId);
                const newContent = { ...content };
                newContent.content.field = getPathToParticipantId(set.content.setType);
                newContent.content.value = set.content.ids;
                contents.push(newContent);
            } else {
                contents.push(content);
            }
        };
        if (Array.isArray(content.content)) {
            for (const deepContent of content.content) {
                await handleContent(deepContent);
            }
        } else {
            await handleContent(content);
        }
    }
    return { op: 'and', content: contents };
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
