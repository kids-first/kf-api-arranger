import jwt from 'jsonwebtoken';

const privateKey = `
-----BEGIN RSA PRIVATE KEY-----
MIIBOwIBAAJBAJgoVgqi7/C9uSoUsfQeep2Dbw5HfXWQIyypg+XZ3NqsxTA2k2Fr
2vmBu82iGsNgwWBKac5IOzSGvyob1l64MkUCAwEAAQJAQ7b/w7ALtEna091t7MR7
sQnDLMmoDd/dp4yxRGOWpEI3TEOWSS6pEmwsvHuCKT18UmxnoHkBU8drgnw0/Rd5
6QIhAPb9YscAI0oaAQufnWz4qupF6iHC05AEu/4HuLUKbwKjAiEAnbVSNG/8aVSU
3az9OuPMj1KdbIiCgOh6cq7qPFWiLfcCIQDizfmnzcuaH1j4aIEycQLaEIuYpwSJ
ip9q/YIy1TrtSwIge4GQizhYODThEGl1NzVG8ccFOgX+De4CVuXc0rtNcykCIQC0
JBCiTrVNMy4wmZruwoG/sae517Jl6cIFePSifpOTsA==
-----END RSA PRIVATE KEY-----
`;

export const publicKey = `MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJgoVgqi7/C9uSoUsfQeep2Dbw5HfXWQIyypg+XZ3NqsxTA2k2Fr2vmBu82iGsNgwWBKac5IOzSGvyob1l64MkUCAwEAAQ==`;

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
