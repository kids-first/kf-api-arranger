require('dotenv-safe').config({
  allowEmptyValues: true
});


export const port = process.env.PORT || 5050;

export const egoURL = process.env.EGO_API;

export const projectId = process.env.PROJECT_ID;

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGenomicFeatureSuggestion = process.env.GF_INDEX_NAME;

export const variantStatsIndex = process.env.VARIANT_STATS_INDEX;
