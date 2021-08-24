import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 5050;

export const egoURL = process.env.EGO_API;

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGeneFeatureSuggestion = process.env.GENES_SUGGESTIONS_INDEX_NAME;
export const indexNameVariantFeatureSuggestion = process.env.VARIANTS_SUGGESTIONS_INDEX_NAME;
