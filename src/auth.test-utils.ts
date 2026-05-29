import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';

// Generate a fresh RSA keypair per test process. jsonwebtoken@9 enforces a
// 2048-bit minimum for RS256; the previous hardcoded 512-bit fixture would
// throw. Keycloak-connect accepts the SPKI public key as a base64-only
// string (no PEM markers), matching its `'realm-public-key'` config option.
const { privateKey: generatedPrivateKey, publicKey: generatedPublicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const privateKey = generatedPrivateKey;
export const publicKey = generatedPublicKey
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');

export const fakeKeycloakRealm = 'fake_realm';
export const fakeKeycloakClient = 'fake_client';
export const fakeKeycloakUrl = 'https://fake_keycloak_url.com/auth';

export const getToken = (expire = 1000, sub = '12345-678-90abcdef', roles = []) =>
    jwt.sign(
        {
            iss: `${fakeKeycloakUrl}/realms/${fakeKeycloakRealm}`,
            sub: sub,
            aud: 'kf-api-arranger',
            jti: '2c166d55-5ae6-4fb4-9daa-a1d5e1f535d7',
            user_id: sub,
            typ: 'Bearer',
            azp: 'portal-ui',
            session_state: 'ae2d1238-0180-4ea1-978a-8e9a95ba44f4',
            acr: '1',
            realm_access: {
                roles,
            },
            scope: 'email profile',
            email_verified: false,
            name: 'test test',
            groups: [],
            preferred_username: 'test@test.test',
            given_name: 'test',
            family_name: 'test',
            email: 'test@test.test',
        },
        privateKey,
        {
            expiresIn: expire,
            algorithm: 'RS256',
            keyid: 'Ip-PDWNUlHbpuTJ7mFERzFzm8CRDJU0A7qSRZMIFoQ0',
        },
    );
