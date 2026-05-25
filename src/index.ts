import { expressMiddleware } from '@as-integrations/express5';
import express from 'express';
import Keycloak from 'keycloak-connect';

import buildApp from './app.js';
import { port, projectId } from './env.js';
import { buildGraphqlServer } from './graphql/server.js';
import keycloakConfig from './keycloak.js';

process.on('uncaughtException', err => {
    console.log(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at ', promise, `reason: ${reason}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log(`Process ${process.pid} has been interrupted`);
    process.exit(0);
});

const keycloak = new Keycloak({}, keycloakConfig);

const k: any = keycloak;
const originalValidateGrant = k.grantManager.validateGrant;
k.grantManager.validateGrant = grant =>
    originalValidateGrant.call(k.grantManager, grant).catch(err => {
        console.error('Grant Validation Error', err);
        throw err;
    });

// Build the GraphQL server first — its `runInternalQuery` runs the
// in-process queries the /sets + /phenotypes routes need.
const { server: apollo, context, runInternalQuery } = await buildGraphqlServer();
const app = buildApp(keycloak, runInternalQuery);

// Mount Apollo at /${projectId}/graphql — single project per deployment,
// driven entirely by the PROJECT_ID env var (default 'include').
// TODO re-enable keycloak.protect() once auth flow is validated end-to-end.
app.use(
    `/${projectId}/graphql`,
    express.json({ limit: '50mb' }),
    expressMiddleware(apollo, { context: async () => context }),
);

app.listen(port, () => {
    console.log('kf-api-arranger (post-arranger) starting');
    console.log(`⚡️ Listening on port ${port} ⚡️`);
});
