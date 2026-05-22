// server-v2 entry: loads N entity schemas, attaches resolvers, starts Apollo.
// Slice X (multi-entity) — one process serves all entities under one Root.

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema, loadEntity, type EntityModule } from './schema/index.js';
import { createResolvers, type ServerContext } from './resolvers.js';
import { createRealEsClient, pingCluster } from './es/realClient.js';

const REPO_ROOT = '..'; // server-v2 sibling to experiments/

// The 7 entity ES indices that include-portal-ui queries against. Each one
// needs a matching mapping JSON at experiments/data/mappings/<index>.json
// and an _id-matching entry in the arranger-projects fixture.
const ES_INDICES = [
    'biospecimen_centric',
    'file_centric',
    'gene_centric',
    'participant_centric',
    'specimen_tree_centric',
    'study_centric',
    'variant_centric',
] as const;

const status = await pingCluster();
console.log(`ES cluster status: ${status}`);

const entities: EntityModule[] = ES_INDICES.map(esIndex =>
    loadEntity({
        mappingPath: `${REPO_ROOT}/experiments/data/mappings/${esIndex}.json`,
        projectsPath: `${REPO_ROOT}/experiments/data/arranger-projects/include.json`,
        esIndex,
    }),
);

for (const e of entities) {
    console.log(`  ${e.esIndex} → ${e.entityName}  (${e.nestedFields.length} nested fields)`);
}

const rawSchema = buildSchema(entities);

const schema = addResolversToSchema({
    schema: rawSchema,
    resolvers: createResolvers(entities.map(e => ({
        entityName: e.entityName,
        esIndex: e.esIndex,
        nestedFields: e.nestedFields,
        extendedEntries: e.extendedEntries,
        columnsState: e.columnsState,
    }))),
});

const es = createRealEsClient();
const server = new ApolloServer<ServerContext>({ schema });

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ es }),
});

console.log(`server-v2 ready at ${url}  (${entities.length} entities)`);
