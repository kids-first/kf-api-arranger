// GraphQL server factory. Builds the schema from real ES at startup,
// instantiates an Apollo 5 server, and returns it ready to be mounted as
// express middleware by the outer Express app.
//
// Boot sequence (one call to `buildGraphqlServer()`):
//   1. requireEsHost via pingCluster() — fail fast if ES_HOST unset/unreachable.
//   2. Build the EsClient.
//   3. Fetch project docs (1 call) + all mappings (N parallel) from ES.
//   4. Compose entity GraphQL types from the in-memory data.
//   5. Build schema, attach resolvers, return { server, context }.
//
// File-mode `loadEntity` (schema/index.ts) still exists — it backs
// __check__.ts against the committed arranger-projects fixture.

import { ApolloServer } from '@apollo/server';
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

export type GraphqlServerHandle = {
    server: ApolloServer<ServerContext>;
    context: ServerContext;
};

// `arranger-projects-<projectId>` is where per-entity config (extended +
// columns-state) lives. Caller supplies the projectId from env.
export async function buildGraphqlServer(projectId: string): Promise<GraphqlServerHandle> {
    const status = await pingCluster();
    console.log(`ES cluster status: ${status}`);

    const es = createRealEsClient();
    const entities: EntityModule[] = await loadAllEntitiesFromEs(es, projectId, ES_INDICES);

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
    await server.start();

    return { server, context: { es } };
}
