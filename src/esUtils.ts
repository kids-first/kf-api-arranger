import { Client } from '@elastic/elasticsearch';

export const esFileIndex = 'file_centric';
export const esStudyIndex = 'study_centric';
export const esParticipantIndex = 'participant_centric';
export const esBiospecimenIndex = 'biospecimen_centric';
export const esVariantIndex = 'variant_centric';
export const esVariantSomaticIndex = 'variant_somatic_centric';
export const esDiffGeneExpIndex = 'diff_gene_exp';
export const esSampleGeneExpIndex = 'sample_gene_exp';

export const ES_SEARCH_MAX_BUCKETS = 100000;
export const ES_SEARCH_MAX_HITS = 10000;
export const ES_CHROMOSOME_AGG_SIZE = 25; // chr 1 to 22 + X + Y + M

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
