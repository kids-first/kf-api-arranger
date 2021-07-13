import Arranger from '@arranger/server';
import { port, projectId, esHost } from './env';
import { onlyAdminMutations, setMutations } from './middleware';
import buildApp from './app';

const app = buildApp();

Arranger({
  // io,
  projectId,
  esHost,
  graphqlOptions: {
    // context: ({ jwt }) => ({ jwt }),
    middleware: [onlyAdminMutations, setMutations],
  },
}).then((router) => {
  app.use(router);

  app.listen(port, async () => {
    console.log(`⚡️ Listening on port ${port} ⚡️`);
  });
});
