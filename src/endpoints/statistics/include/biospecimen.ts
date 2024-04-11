import { Client } from '@elastic/elasticsearch';

import { biospecimenIdKey, esBiospecimenIndex } from '../../../env';

export const fetchBiospecimenStats = async (client: Client): Promise<number> => {
    const { body } = await client.search({
        index: esBiospecimenIndex,
        body: {
            aggs: { types_count: { value_count: { field: biospecimenIdKey } } },
        },
        size: 0,
    });
    return body.aggregations.types_count.value;
};
