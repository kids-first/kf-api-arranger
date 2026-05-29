import type { Keycloak } from 'keycloak-connect';
import { keycloakClient, keycloakRealm, keycloakURL } from './env.js';

const keycloakConfig = {
    realm: keycloakRealm,
    'confidential-port': 0,
    'bearer-only': true,
    'auth-server-url': keycloakURL,
    'ssl-required': 'external',
    resource: keycloakClient,
};

export default keycloakConfig;

// Adds error logging around keycloak-connect's internal grantManager.
// validateGrant. The library's public type doesn't expose this hook, so we
// patch through a narrowed structural cast on the internal property.
export function installGrantErrorLogger(keycloak: Keycloak): void {
    const k = keycloak as Keycloak & {
        grantManager: {
            validateGrant: (grant: unknown) => Promise<unknown>;
        };
    };
    const originalValidateGrant = k.grantManager.validateGrant;
    k.grantManager.validateGrant = grant =>
        originalValidateGrant.call(k.grantManager, grant).catch(err => {
            console.error('Grant Validation Error', err);
            throw err;
        });
}
