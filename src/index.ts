/* eslint-disable no-console */
import 'regenerator-runtime/runtime.js';
import Arranger from '@arranger/server';
import Keycloak from 'keycloak-connect';
import { port, esHost } from './env';
import { onlyAdminMutations } from './middleware';
import buildApp from './app';
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
const app = buildApp(keycloak);
const externalContext = (req, _res, _con) => ({ auth: req.kauth?.grant?.access_token || {} });

Arranger({
    esHost,
    graphqlOptions: {
        middleware: [onlyAdminMutations],
        // context: externalContext, // Uncomment it when latest version of arranger/server will be deployed.
    },
}).then(router => {
    app.get('/*/ping', router);
    app.use(keycloak.protect(), router);

    app.listen(port, async () => {
        console.log(`⚡️ Listening on port ${port} ⚡️`);
    });
});
