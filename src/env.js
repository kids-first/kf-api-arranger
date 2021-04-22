require('dotenv-safe').config({
  allowEmptyValues: true
});


export const port = process.env.PORT || 5050;

export const egoURL = process.env.EGO_API;

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGenomicFeatureSuggestion = process.env.GENOMIC_SUGGESTIONS_INDEX_NAME;
