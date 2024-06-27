/* eslint-disable no-console */
import 'regenerator-runtime/runtime.js';

import Arranger from '@arranger/server';
import { getProject } from '@arranger/server';
import Keycloak from 'keycloak-connect';

import buildApp from './app';
import { esHost, esPass, esUser, port } from './env';
import keycloakConfig from './keycloak';

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

const app = buildApp(keycloak, getProject);
const externalContext = (req, _res, _con) => ({ auth: req.kauth?.grant?.access_token || {} });

Arranger({
    esHost,
    esUser,
    esPass,
    graphqlOptions: {
        context: externalContext,
    },
}).then(router => {
    app.get('/*/ping', router);
    app.use(keycloak.protect(), router);

    const k: any = keycloak;
    const originalValidateGrant = k.grantManager.validateGrant;
    k.grantManager.validateGrant = grant =>
        originalValidateGrant.call(k.grantManager, grant).catch(err => {
            console.error('Grant Validation Error', err);
            throw err;
        });

    app.listen(port, async () => {
        console.log('Arranger-Next Starting');
        console.log(`⚡️ Listening on port ${port} ⚡️`);
    });
});
