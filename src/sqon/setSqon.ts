import { getUserSet } from '../endpoints/sets/setsFeature';
import { SetSqon } from '../endpoints/sets/setsTypes';
import { participantBiospecimenKey, participantFileKey, participantKey } from '../env';

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
