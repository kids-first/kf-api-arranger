import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 5050;

export const keycloakURL = process.env.KEYCLOAK_URL;

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGenomicFeatureSuggestion = process.env.GENOMIC_SUGGESTIONS_INDEX_NAME;
