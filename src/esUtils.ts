import { Client } from '@elastic/elasticsearch';

export const createIndexIfNeeded = async (esClient: Client, indexName: string): Promise<boolean> => {
    const existsResp = await esClient.indices.exists({
        index: indexName,
    });
    const mustCreateIndex = !existsResp?.body;
    if (mustCreateIndex) {
        await esClient.indices.create({
            index: indexName,
        });
    }
    return mustCreateIndex;
};

export const countNOfDocs = async (esClient: Client, indexName: string): Promise<number> => {
    const respCounts = await esClient.count({
        index: indexName,
    });
    return respCounts?.body?.count;
};
