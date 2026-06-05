import { expressMiddleware } from '@as-integrations/express5';
import express from 'express';
import Keycloak from 'keycloak-connect';

import buildApp from './app.js';
import { port, projectId } from './env.js';
import { buildGraphqlServer } from './graphql/server.js';
import keycloakConfig, { installGrantErrorLogger } from './keycloak.js';
import { resolveSetIdMiddleware } from './middleware/resolveSetIdInSqon.js';

process.on('uncaughtException', err => {
    console.error(`Uncaught Exception: ${err.stack ?? err.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const detail = reason instanceof Error ? (reason.stack ?? reason.message) : reason;
    console.error('Unhandled rejection at ', promise, `reason: ${detail}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.info(`Process ${process.pid} has been interrupted`);
    process.exit(0);
});

const keycloak = new Keycloak({}, keycloakConfig);
installGrantErrorLogger(keycloak);

// Build the GraphQL server first — its `runInternalQuery` runs the
// in-process queries the /sets + /phenotypes routes need.
const { server: apollo, context, runInternalQuery } = await buildGraphqlServer();
const app = buildApp(keycloak, runInternalQuery);

// Mount Apollo at /${projectId}/graphql — single project per deployment,
// driven entirely by the PROJECT_ID env var (default 'include').
// resolveSetIdMiddleware runs post-auth so it has req.kauth.grant available
// and can't be triggered by unauthenticated callers.
app.use(
    `/${projectId}/graphql`,
    keycloak.protect(),
    express.json({ limit: '50mb' }),
    resolveSetIdMiddleware(),
    expressMiddleware(apollo, { context: async () => context }),
);

const httpServer = app.listen(port, () => {
    console.info(`⚡️ Listening on port ${port} ⚡️`);
});

// Surface bind failures explicitly and fail fast, instead of letting them fall
// through the generic uncaughtException handler. Notably EACCES, which a non-root
// user hits when binding a privileged port (<1024) — see Dockerfile USER note.
httpServer.on('error', err => {
    console.error(`HTTP server error: ${err.stack ?? err.message}`);
    process.exit(1);
});
