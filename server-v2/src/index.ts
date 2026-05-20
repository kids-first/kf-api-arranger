// server-v2 entry: loads schema, attaches resolvers, starts Apollo.

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { addResolversToSchema } from '@graphql-tools/schema';
import { loadSchema } from './schema/index.js';
import { collectNestedFields } from './schema/fieldTree.js';
import { createResolvers, type ServerContext } from './resolvers.js';
import { createRealEsClient, pingCluster } from './es/realClient.js';

const REPO_ROOT = '..'; // server-v2 sibling to experiments/
const ES_INDEX = 'study_centric';

const status = await pingCluster();
console.log(`ES cluster status: ${status}`);

const { schema: rawSchema, entityName, tree } = loadSchema({
    mappingPath: `${REPO_ROOT}/experiments/data/mappings/${ES_INDEX}.json`,
    projectsPath: `${REPO_ROOT}/experiments/data/arranger-projects/include.json`,
    esIndex: ES_INDEX,
});

const nestedFields = collectNestedFields(tree);
console.log(`nested fields (${nestedFields.length}): ${nestedFields.slice(0, 5).join(', ')}${nestedFields.length > 5 ? ', ...' : ''}`);

const schema = addResolversToSchema({
    schema: rawSchema,
    resolvers: createResolvers(entityName, nestedFields),
});

const es = createRealEsClient();
const server = new ApolloServer<ServerContext>({ schema });

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ es, esIndex: ES_INDEX }),
});

console.log(`server-v2 ready at ${url} (entity: ${entityName}, real ES)`);
