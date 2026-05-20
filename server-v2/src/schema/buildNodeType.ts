// Builds the <entity>Node GraphQLObjectType + the shared Node interface.
//
// Ordering matches arranger exactly: synthesized fields first (id, score),
// then scalar fields alphabetically, then object/nested fields alphabetically.
// `isArray` from the extended mapping wraps SCALAR types in [T]; object/nested
// types remain singular (array-ness is encoded in their Connection sub-type,
// not generated in slice S).

import {
    GraphQLID,
    GraphQLInterfaceType,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from 'graphql';
import type {
    GraphQLFieldConfigMap,
    GraphQLOutputType,
} from 'graphql';
import { GraphQLInt, gqlScalarFor } from './typeMappings.js';
import type { ExtendedMap, FieldNode, FieldTree } from './types.js';

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function buildNodeInterface(): GraphQLInterfaceType {
    return new GraphQLInterfaceType({
        name: 'Node',
        fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
    });
}

type BuildNodeTypeArgs = {
    tree: FieldTree;
    extendedMap: ExtendedMap;
    entityName: string;
    nodeInterface: GraphQLInterfaceType;
};

export function buildNodeType(args: BuildNodeTypeArgs): GraphQLObjectType {
    const { tree, extendedMap, entityName, nodeInterface } = args;
    const nodeTypeName = `${entityName}Node`;

    const subTypes = new Map<string, GraphQLObjectType>();
    const getOrBuildSubType = (name: string): GraphQLObjectType => {
        const existing = subTypes.get(name);
        if (existing) return existing;
        const t = new GraphQLObjectType({
            name,
            fields: () => ({ _placeholder: { type: GraphQLString } }),
        });
        subTypes.set(name, t);
        return t;
    };

    const gqlTypeFor = (
        field: FieldNode,
        dottedPath: string,
        parentNamePrefix: string,
    ): GraphQLOutputType => {
        if (field.kind === 'scalar') {
            const base = gqlScalarFor(field.esType);
            const meta = extendedMap.get(dottedPath);
            return meta?.isArray ? new GraphQLList(base) : base;
        }
        if (field.kind === 'nested' || field.kind === 'object') {
            return getOrBuildSubType(`${parentNamePrefix}${capFirst(field.name)}`);
        }
        return GraphQLString;
    };

    const ordered = tree.fields
        .filter(f => f.kind !== 'unsupported')
        .slice()
        .sort((a, b) => {
            const aIsObj = a.kind === 'nested' || a.kind === 'object';
            const bIsObj = b.kind === 'nested' || b.kind === 'object';
            if (aIsObj !== bIsObj) return aIsObj ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

    return new GraphQLObjectType({
        name: nodeTypeName,
        interfaces: [nodeInterface],
        fields: (): GraphQLFieldConfigMap<unknown, unknown> => {
            const out: GraphQLFieldConfigMap<unknown, unknown> = {
                id: { type: new GraphQLNonNull(GraphQLID) },
                score: { type: GraphQLInt },
            };
            for (const f of ordered) {
                out[f.name] = { type: gqlTypeFor(f, f.name, entityName) };
            }
            return out;
        },
    });
}
