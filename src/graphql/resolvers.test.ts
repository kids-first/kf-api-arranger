import { addResolversToSchema } from '@graphql-tools/schema';
import { type GraphQLSchema, graphql } from 'graphql';
import type { EsClient, EsMappingResponse, EsSearchParams, EsSearchResponse } from '../es/client.js';
import { buildSourceIncludes, createResolvers } from './resolvers.js';
import { loadAllEntitiesFromEs } from './schema/esLoaders.js';
import { buildSchema } from './schema/index.js';

describe('buildSourceIncludes', () => {
    it('returns the top-level keys of the node selection', () => {
        expect(buildSourceIncludes({ edges: { node: { participant_id: {}, sex: {} } } })).toEqual([
            'participant_id',
            'sex',
        ]);
    });

    it('does not descend into object or nested selections', () => {
        const selection = {
            edges: { node: { study: { study_code: {} }, files: { hits: { edges: { node: { file_id: {} } } } } } },
        };
        expect(buildSourceIncludes(selection)).toEqual(['study', 'files']);
    });

    it('returns false when no document body is needed', () => {
        expect(buildSourceIncludes({ total: {} })).toBe(false);
        expect(buildSourceIncludes({ edges: { searchAfter: {} } })).toBe(false);
        expect(buildSourceIncludes({ edges: { node: { __typename: {} } } })).toBe(false);
    });
});

const MAPPING = {
    participant_centric: {
        mappings: {
            properties: {
                participant_id: { type: 'keyword' },
                sex: { type: 'keyword' },
                study: { properties: { study_code: { type: 'keyword' } } },
                files: { type: 'nested', properties: { file_id: { type: 'keyword' } } },
            },
        },
    },
};

const HITS = [
    {
        _id: 'es-id-1',
        _source: {
            participant_id: 'PT-1',
            sex: 'female',
            study: { study_code: 'ST-1' },
            files: [{ file_id: 'FI-1' }, { file_id: 'FI-2' }],
        },
    },
];

const buildHarness = async (): Promise<{ schema: GraphQLSchema; es: EsClient; lastSearch: () => EsSearchParams }> => {
    let lastSearch: EsSearchParams;
    const es: EsClient = {
        search: async <TSource = Record<string, unknown>>(params: EsSearchParams) => {
            lastSearch = params;
            return {
                hits: { total: { value: 1, relation: 'eq' }, hits: HITS },
            } as unknown as EsSearchResponse<TSource>;
        },
        getMapping: async () => MAPPING as unknown as EsMappingResponse,
    };
    const entities = await loadAllEntitiesFromEs(es, [{ esIndex: 'participant_centric', entityName: 'participant' }]);
    const schema = addResolversToSchema({ schema: buildSchema(entities), resolvers: createResolvers(entities) });
    return { schema, es, lastSearch: () => lastSearch };
};

const run = async (source: string) => {
    const { schema, es, lastSearch } = await buildHarness();
    const result = await graphql({ schema, source, contextValue: { es } });
    expect(result.errors).toBeUndefined();
    return { data: result.data as Record<string, any>, search: lastSearch() };
};

describe('hits resolver _source projection', () => {
    it('asks ES only for the selected fields', async () => {
        const { data, search } = await run(`
            { participant { hits(first: 10) { edges { node { participant_id } } } } }
        `);

        expect(search._source).toEqual(['participant_id']);
        expect(data.participant.hits.edges[0].node.participant_id).toBe('PT-1');
    });

    it('projects the whole nested field so its total stays correct', async () => {
        const { data, search } = await run(`
            { participant { hits { edges { node { files { hits { total } } } } } } }
        `);

        expect(search._source).toEqual(['files']);
        expect(data.participant.hits.edges[0].node.files.hits.total).toBe(2);
    });

    it('skips the document body when only counts are requested', async () => {
        const { data, search } = await run('{ participant { hits { total } } }');

        expect(search._source).toBe(false);
        expect(data.participant.hits.total).toBe(1);
    });

    it('serves the synthesized id without fetching the document body', async () => {
        const { data, search } = await run('{ participant { hits { edges { node { id } } } } }');

        expect(search._source).toEqual(['id']);
        expect(data.participant.hits.edges[0].node.id).toBe('es-id-1');
    });

    it('collects fields spread in via a fragment', async () => {
        const { search } = await run(`
            { participant { hits { edges { node { participant_id ...extra } } } } }
            fragment extra on participantNode { sex }
        `);

        expect(search._source).toEqual(['participant_id', 'sex']);
    });
});
