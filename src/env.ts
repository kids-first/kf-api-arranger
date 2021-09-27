import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 5050;

export const keycloakURL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const keycloakRealm = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const keycloakClient = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGeneFeatureSuggestion = process.env.GENES_SUGGESTIONS_INDEX_NAME;
export const indexNameVariantFeatureSuggestion = process.env.VARIANTS_SUGGESTIONS_INDEX_NAME;

export const riffURL = process.env.RIFF_URL || 'https://riff-keycloak-qa.kf-strides.org';
