import dotenv from 'dotenv';

dotenv.config();

export const PROJECT_KIDSFIRST = 'KidsFirst';
export const PROJECT_INCLUDE = 'Include';

export const project = process.env.PROJECT || PROJECT_KIDSFIRST;
export const port = process.env.PORT || 5050;

export const keycloakURL = process.env.KEYCLOAK_URL || 'https://kf-keycloak-qa.kf-strides.org/auth';
export const keycloakRealm = process.env.KEYCLOAK_REALM || 'kidsfirstdrc';
export const keycloakClient = process.env.KEYCLOAK_CLIENT || 'kidsfirst-apis';

export const esHost = process.env.ES_HOST || 'http://localhost:9200';

export const esFileIndex = process.env.ES_FILE_INDEX || 'file_centric';
export const esStudyIndex = process.env.ES_STUDY_INDEX || 'study_centric';
export const esParticipantIndex = process.env.ES_PARTICIPANT_INDEX || 'participant_centric';
export const esBiospecimenIndex = process.env.ES_BIOSPECIMEN_INDEX || 'biospecimen_centric';

export const maxNOfGenomicFeatureSuggestions = process.env.MAX_NUMBER_OF_GF_SUGGESTIONS || 5;

export const indexNameGeneFeatureSuggestion = process.env.GENES_SUGGESTIONS_INDEX_NAME;
export const indexNameVariantFeatureSuggestion = process.env.VARIANTS_SUGGESTIONS_INDEX_NAME;

export const riffURL = process.env.RIFF_URL || 'https://riff-qa.kf-strides.org';
export const sendUpdateToSqs = process.env.SEND_UPDATE_TO_SQS !== 'false';
export const sqsQueueUrl = process.env.SQS_QUEUE_URL || '';
export const maxSetContentSize: number = Number.parseInt(process.env.MAX_SET_CONTENT_SIZE) || 100000;

export const survivalPyFile = process.env.SURVIVAL_PY_FILE || 'resource/py/survival.py';
export const pythonPath = process.env.PYTHON_PATH || '/usr/local/bin/python3';

export const idKey = process.env.ID_KEY || 'kf_id';
export const fileIdKey = process.env.FILE_ID_KEY || 'kf_id';
export const studyIdKey = process.env.STUDY_ID_KEY || 'kf_id';
export const participantIdKey = process.env.PARTICIPANT_ID_KEY || 'kf_id';
export const biospecimenIdKey = process.env.BIOSPECIMEN_ID_KEY || 'kf_id';
export const familyIdKey = process.env.FAMILY_ID_KEY || 'family_id';

export const cacheTTL: number = Number.parseInt(process.env.CACHE_TTL_SEC) || 3600;
