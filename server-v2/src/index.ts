// server-v2 entry: loads N entity schemas from real ES, attaches resolvers,
// starts Apollo. Slice X (multi-entity) — one process serves all entities
// under one Root.
//
// Boot sequence:
//   1. requireEsHost via pingCluster() — fail fast if ES_HOST unset/unreachable.
//   2. Build the EsClient.
//   3. Fetch project docs (1 call) + all mappings (N parallel) from ES.
//   4. Compose entity GraphQL types from the in-memory data.
//   5. Build schema, attach resolvers, start Apollo standalone on :4000.
//
// File-mode `loadEntity` (schema/index.ts) still exists — it backs __check__.ts
// against the committed arranger-projects fixture.

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema, type EntityModule } from './schema/index.js';
import { loadAllEntitiesFromEs } from './schema/esLoaders.js';
import { createResolvers, type ServerContext } from './resolvers.js';
import { createRealEsClient, pingCluster } from './es/realClient.js';

// The 7 entity ES indices that include-portal-ui queries against. Each one
// must have a matching _id in the arranger-projects-<PROJECT_ID> doc.
const ES_INDICES = [
    'biospecimen_centric',
    'file_centric',
    'gene_centric',
    'participant_centric',
    'specimen_tree_centric',
    'study_centric',
    'variant_centric',
] as const;

// `arranger-projects-<PROJECT_ID>` is where per-entity config (extended +
// columns-state) lives. Hardcoded for now — INCLUDE is the only project.
const PROJECT_ID = 'include';

const status = await pingCluster();
console.log(`ES cluster status: ${status}`);

const es = createRealEsClient();
const entities: EntityModule[] = await loadAllEntitiesFromEs(es, PROJECT_ID, ES_INDICES);

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

const server = new ApolloServer<ServerContext>({ schema });

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ es }),
});

console.log(`server-v2 ready at ${url}  (${entities.length} entities)`);
