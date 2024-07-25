import dotenv from 'dotenv';

dotenv.config();

export const port = process.env.PORT || 5050;

export const keycloakURL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const keycloakRealm = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const keycloakClient = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const esHost = process.env.ES_HOST || 'http://localhost:9200';
export const esUser = process.env.ES_USER;
export const esPass = process.env.ES_PASS;

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGeneFeatureSuggestion = process.env.GENES_SUGGESTIONS_INDEX_NAME;
export const indexNameVariantFeatureSuggestion = process.env.VARIANTS_SUGGESTIONS_INDEX_NAME;

export const userApiURL = process.env.USER_API_URL || 'https://include-users-api-qa.373997854230.d3b.io';

export const maxSetContentSize: number = Number.parseInt(process.env.MAX_SET_CONTENT_SIZE) || 10000;

export const cacheTTL: number = Number.parseInt(process.env.CACHE_TTL_SEC) || 3600;
