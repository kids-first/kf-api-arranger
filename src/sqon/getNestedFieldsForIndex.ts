import { getNestedFields } from '@arranger/mapping-utils';
import { Client } from '@elastic/elasticsearch';

export const getNestedFieldsForIndex = async (client: Client, indexName: string): Promise<string[]> => {
    const rM = await client.indices.getMapping({ index: indexName });
    return getNestedFields(Object.values(rM.body || {})[0]?.mappings?.properties);
};
