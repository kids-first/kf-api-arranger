import { keycloakClient, keycloakPublicKey, keycloakRealm, keycloakURL } from './env';

const keycloakConfig = {
    realm: keycloakRealm,
    'confidential-port': 0,
    'bearer-only': true,
    'auth-server-url': keycloakURL,
    'ssl-required': 'external',
    resource: keycloakClient,
    'realm-public-key': keycloakPublicKey,
};

export default keycloakConfig;
