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

// --- Shutdown / lifecycle observability ---
// These observers register NO signal handlers, so they do not change how the
// process terminates — they only narrate it. The goal is to tell apart, in the
// ECS/CloudWatch logs, a clean exit-0 from a SIGKILL (137), and a deploy-stop
// from a boot crash-loop. Remove once the deploy behavior is understood.

// Fires on ANY exit (incl. process.exit), but NOT on SIGKILL. The definitive
// exit code, observed from inside the process, with uptime + memory for context.
process.on('exit', code => {
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.info(
        `[lifecycle] exit code=${code} uptime=${process.uptime().toFixed(1)}s rss=${rssMb}MB pid=${process.pid}`,
    );
});

// Fires ONLY when the event loop empties on its own — i.e. nothing is left
// holding the process open (the HTTP server stopped listening). Never fires for
// process.exit() or a signal kill. If you see this before an exit-0, something
// closed the server out from under us.
process.on('beforeExit', code => {
    console.info(`[lifecycle] event loop drained (server no longer listening?) pending-exit=${code}`);
});

// Node runtime warnings — e.g. MaxListenersExceededWarning (we + Apollo both
// add signal listeners) or deprecations. Cheap, occasionally the smoking gun.
process.on('warning', warning => {
    console.warn(`[warning] ${warning.name}: ${warning.message}`);
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
    // Boot banner: the environment knobs that decide whether Apollo registered
    // its own SIGINT/SIGTERM handlers (NODE_ENV !== 'test') and whether node is
    // PID 1 (which silently ignores unhandled signals). Read these from the live
    // container instead of guessing from the task definition.
    console.info(
        `[boot] pid=${process.pid} isPID1=${process.pid === 1} NODE_ENV=${process.env.NODE_ENV ?? '(unset)'} port=${port}`,
    );
    // Logged after `await buildGraphqlServer()` (-> server.start()), so this
    // reflects whether Apollo actually attached a SIGTERM handler at runtime.
    console.info(
        `[boot] signal listeners: SIGTERM=${process.listenerCount('SIGTERM')} SIGINT=${process.listenerCount('SIGINT')}`,
    );
    console.info(`⚡️ Listening on port ${port} ⚡️`);
});

// A bind failure (e.g. EADDRINUSE) surfaces here — log it explicitly and keep
// fail-fast, rather than letting it fall through the generic uncaughtException.
httpServer.on('error', err => {
    console.error(`[boot] HTTP server error: ${err.stack ?? err.message}`);
    process.exit(1);
});

// Catches the "server stopped listening" path that would let the loop drain to
// an unexpected exit-0.
httpServer.on('close', () => {
    console.info('[lifecycle] HTTP server "close" event — no longer accepting connections');
});
