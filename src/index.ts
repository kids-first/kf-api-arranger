/* eslint-disable no-console */
import 'regenerator-runtime/runtime.js';

import Arranger from '@arranger/server';
import { getProject } from '@arranger/server';
import SQS from 'aws-sdk/clients/sqs';
import Keycloak from 'keycloak-connect';

import buildApp from './app';
import { esHost, port } from './env';
import keycloakConfig from './keycloak';
import { resolveSetInQueries } from './middleware';

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
const sqs = new SQS({ apiVersion: '2012-11-05' });
const app = buildApp(keycloak, sqs, getProject);
const externalContext = (req, _res, _con) => ({ auth: req.kauth?.grant?.access_token || {} });

Arranger({
    esHost,
    graphqlOptions: {
        middleware: [resolveSetInQueries],
        context: externalContext,
    },
}).then(router => {
    app.get('/*/ping', router);
    app.use(keycloak.protect(), router);

    app.listen(port, async () => {
        console.log(`⚡️ Listening on port ${port} ⚡️`);
    });
});
