/* eslint-disable no-console */
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import Keycloak from 'keycloak-connect';

import buildApp from './app.js';
import { ArrangerProject } from './arrangerUtils.js';
import { port } from './env.js';
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

// Stub during the cut-over (branch `explore/post-arranger`). Routes that
// dispatch via `getProject().runQuery` (`/sets`, `/phenotypes`) throw at
// request time. Both are slated for redesign to call ES directly rather
// than detour through GraphQL.
const getProject = (_projectId: string): ArrangerProject => ({
    runQuery: async () => {
        throw new Error(
            'getProject().runQuery is deferred during the server-v2 cut-over. ' +
            'Routes calling it (/sets, /phenotypes) are paused on branch explore/post-arranger.',
        );
    },
});

const k: any = keycloak;
const originalValidateGrant = k.grantManager.validateGrant;
k.grantManager.validateGrant = grant =>
    originalValidateGrant.call(k.grantManager, grant).catch(err => {
        console.error('Grant Validation Error', err);
        throw err;
    });

const app = buildApp(keycloak, getProject);
const { server: apollo, context } = await buildGraphqlServer();

// Mount Apollo at /<project>/graphql. The `project` URL param is currently
// ignored — server-v2 serves one merged schema for all entities — but we
// keep the existing FE-facing URL contract.
// TODO re-enable keycloak.protect() once auth flow is validated end-to-end.
app.use(
    '/:project/graphql',
    express.json({ limit: '50mb' }),
    expressMiddleware(apollo, { context: async () => context }),
);

app.listen(port, () => {
    console.log('kf-api-arranger (post-arranger) starting');
    console.log(`⚡️ Listening on port ${port} ⚡️`);
});
