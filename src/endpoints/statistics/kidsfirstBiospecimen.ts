import { Client } from '@elastic/elasticsearch';

import { biospecimenIdKey, esParticipantIndex } from '../../env';

export const fetchBiospecimenStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esParticipantIndex,
        body: {
            aggs: {
                list: {
                    nested: { path: 'biospecimens' },
                    aggs: { types_count: { value_count: { field: `biospecimens.${biospecimenIdKey}` } } },
                },
            },
        },
        size: 0,
    });
    return body.aggregations.list.doc_count;
};
