// GraphQL server factory. Builds the schema from real ES at startup,
// instantiates an Apollo 5 server, and returns it ready to be mounted as
// express middleware by the outer Express app.
//
// Boot sequence (one call to `buildGraphqlServer()`):
//   1. requireEsHost via pingCluster() — fail fast if ES_HOST unset/unreachable.
//   2. Build the EsClient.
//   3. Fetch mappings for all entities (N parallel) from ES.
//   4. Derive per-entity `extended` from each mapping (see deriveExtended).
//   5. Compose entity GraphQL types from the in-memory data.
//   6. Build schema, attach resolvers, return { server, context }.

import { ApolloServer } from '@apollo/server';
import { addResolversToSchema } from '@graphql-tools/schema';
import { buildSchema, type EntityModule } from './schema/index.js';
import { loadAllEntitiesFromEs } from './schema/esLoaders.js';
import { createResolvers, type ServerContext } from './resolvers.js';
import { createRealEsClient, pingCluster } from './es/realClient.js';

// The 7 entity ES indices that include-portal-ui queries against, paired
// with the GraphQL entity name each one exposes. Pairing is local config
// because ES `_mapping` has no notion of the GraphQL entity name and the
// pluralization is not derivable from the esIndex (variant_centric →
// variants, gene_centric → genes, specimen_tree_centric → biospecimen_trees).
// Candidate for ES root `_meta.entityName` on the mapping once the ETL
// adopts it.
const ES_ENTITIES: ReadonlyArray<{ esIndex: string; entityName: string }> = [
    { esIndex: 'biospecimen_centric', entityName: 'biospecimen' },
    { esIndex: 'file_centric', entityName: 'file' },
    { esIndex: 'gene_centric', entityName: 'genes' },
    { esIndex: 'participant_centric', entityName: 'participant' },
    { esIndex: 'specimen_tree_centric', entityName: 'biospecimen_trees' },
    { esIndex: 'study_centric', entityName: 'study' },
    { esIndex: 'variant_centric', entityName: 'variants' },
];

export type GraphqlServerHandle = {
    server: ApolloServer<ServerContext>;
    context: ServerContext;
};

export async function buildGraphqlServer(): Promise<GraphqlServerHandle> {
    const status = await pingCluster();
    console.log(`ES cluster status: ${status}`);

    const es = createRealEsClient();
    const entities: EntityModule[] = await loadAllEntitiesFromEs(es, ES_ENTITIES);

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
