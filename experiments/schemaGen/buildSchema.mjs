// Builds a minimal GraphQLSchema focused on the entity Node type for diff testing.
// For today's experiment we ONLY emit `<entity>Node` faithfully.
// Sub-types referenced from <entity>Node (e.g. studyClinical_trials) are placeholders —
// they exist so printSchema is happy, but aren't being diff-tested.

import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLID,
    GraphQLInt,
    GraphQLString,
} from 'graphql';
import { gqlScalarFor } from './typeMappings.mjs';

const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

export function buildSchema({ tree, extendedMap, entityName }) {
    const nodeTypeName = `${entityName}Node`;

    const NodeInterface = new GraphQLInterfaceType({
        name: 'Node',
        fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
        resolveType: () => null,
    });

    const subTypes = new Map();

    const getOrBuildSubType = name => {
        if (subTypes.has(name)) return subTypes.get(name);
        // Placeholder; not part of today's diff
        const t = new GraphQLObjectType({
            name,
            fields: () => ({ _placeholder: { type: GraphQLString } }),
        });
        subTypes.set(name, t);
        return t;
    };

    const gqlTypeFor = (field, dottedPath, parentNamePrefix) => {
        if (field.kind === 'scalar') {
            const base = gqlScalarFor(field.esType);
            const meta = extendedMap.get(dottedPath);
            return meta?.isArray ? new GraphQLList(base) : base;
        }
        if (field.kind === 'nested' || field.kind === 'object') {
            return getOrBuildSubType(`${parentNamePrefix}${capFirst(field.name)}`);
        }
        return GraphQLString; // 'unsupported' fallback — should already be filtered out
    };

    // Arranger orders fields: synthesized first (id, score), then scalars alphabetically,
    // then object/nested-type fields alphabetically. Match that exactly.
    const ordered = tree.fields
        .filter(f => f.kind !== 'unsupported')
        .slice()
        .sort((a, b) => {
            const aIsObj = a.kind === 'nested' || a.kind === 'object';
            const bIsObj = b.kind === 'nested' || b.kind === 'object';
            if (aIsObj !== bIsObj) return aIsObj ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

    const NodeType = new GraphQLObjectType({
        name: nodeTypeName,
        interfaces: [NodeInterface],
        fields: () => {
            const out = {
                id: { type: new GraphQLNonNull(GraphQLID) },
                score: { type: GraphQLInt },
            };
            for (const f of ordered) {
                out[f.name] = { type: gqlTypeFor(f, f.name, entityName) };
            }
            return out;
        },
    });

    const QueryType = new GraphQLObjectType({
        name: 'Query',
        fields: { node: { type: NodeType } },
    });

    return new GraphQLSchema({
        query: QueryType,
        types: [NodeType, NodeInterface],
    });
}
