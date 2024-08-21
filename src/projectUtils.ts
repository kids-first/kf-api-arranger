import { keycloakRealm } from './env';

const KF_REALM = 'kidsfirstdrc';
const INCLUDE_REALM = 'includedcc';

export const isKF = keycloakRealm === KF_REALM;
export const isInclude = keycloakRealm === INCLUDE_REALM;
