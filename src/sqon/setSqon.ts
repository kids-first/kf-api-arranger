import { SetIdToTag } from '../endpoints/sets/setsTypes';
import { getUserSets, postSetsTags } from '../userApi/userApiClient';
import { Content, Sqon } from './types';

const participantKey = 'fhir_id';
const participantFileKey = 'files.fhir_id';
const participantBiospecimenKey = 'files.biospecimens.biospecimen_id';

const getPathToParticipantCentricFieldFromSetType = (setType: string) => {
    if (setType === 'biospecimen') {
        return participantBiospecimenKey;
    } else if (setType === 'file') {
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

    const setToIds: Map<string, { ids: string[]; setType: string }> = new Map(
        userSets
            .filter(x => setIds.has(x.id))
            .map(x => [`set_id:${x.id}`, { ids: x.content.ids, setType: x.content.setType }]),
    );

    const injectIds = (content: Content): Content => {
        const setId = content.value[0];
        const ids = setToIds.get(setId)?.ids;
        const setType = setToIds.get(setId)?.setType;
        return {
            ...content,
            value: ids,
            field: getPathToParticipantCentricFieldFromSetType(setType),
        };
    };

    traverseWithMutationAtSetId(clone, injectIds);

    return clone;
};
