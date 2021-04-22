import Arranger from '@arranger/server';
import { port, esHost } from './env';
import { onlyAdminMutations } from './middleware';
import buildApp from './app';

const app = buildApp();

Arranger({
  esHost,
  graphqlOptions: {
    middleware: [onlyAdminMutations],
  },
}).then((router) => {
  app.use(router);

  app.listen(port, async () => {
    console.log(`⚡️ Listening on port ${port} ⚡️`);
  });
});
