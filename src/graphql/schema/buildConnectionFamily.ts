// Slice V: recursive type builder for entity-level + nested sub-Connection
// type families. Replaces the slice-S stub treatment of nested/object fields
// in the former buildNodeType.ts.
//
// Three kinds of types emitted, mirroring arranger-2.19.2:
//   1. Node type (`<Path>Node`) — has id, score, and recursive fields. Used
//      for entity-level Node and every sub-Connection Node. Implements Node
//      interface.
//   2. Object container (`<Path>`) — flat type for ES `object` fields. Just
//      the children, no id/score, no interface.
//   3. Connection family (5 types per nested field): wrapper `<Path>`,
//      `<Path>Aggregations` (entity-level only), `<Path>Connection`,
//      `<Path>Edge`, `<Path>Node`.
//
// Sub-Connection wrappers skip arranger's `mapping`, `aggsState`,
// `matchBoxState`, and sub-level `extended`/`columnsState`/`aggregations`
// fields — frontend audit (2026-05-22) confirmed none are queried at
// sub-Connection level. Top-level entity wrapper still exposes
// `extended` and `columnsState` (slice U); the args `includeEntityMetadata`
// and `aggsType` switch those on.

import {
    GraphQLBoolean,
    GraphQLID,
    GraphQLInt,
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
import { gqlScalarFor } from './typeMappings.js';
import { GraphQLJSON } from './jsonScalar.js';
import { ColumnsStateType } from './stateTypes.js';
import { SortInputType } from './sortTypes.js';
import type { ExtendedMap, FieldNode } from './types.js';

const capFirst = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// Shared across all entities — multi-entity schemas need a single Node
// interface instance so the schema validator doesn't see N copies. The slice-V
// factory `buildNodeInterface()` was per-call; multi-entity refactor (slice X)
// flipped it to a module-level singleton.
export const NodeInterface = new GraphQLInterfaceType({
    name: 'Node',
    fields: { id: { type: new GraphQLNonNull(GraphQLID) } },
});

type BuildFieldMapArgs = {
    fields: FieldNode[];
    extendedMap: ExtendedMap;
    parentName: string;
    parentPath: string; // dotted path for extendedMap lookup (empty at entity root)
};

// Recursive walker — emits the field map for either a Node type (entity-level
// or sub-Connection Node) or an object container. Order matches arranger:
// scalars first alphabetically, then nested/object fields alphabetically.
function buildFieldMap(args: BuildFieldMapArgs): GraphQLFieldConfigMap<unknown, unknown> {
    const { fields, extendedMap, parentName, parentPath } = args;
    const ordered = fields
        .filter(f => f.kind !== 'unsupported')
        .slice()
        .sort((a, b) => {
            const aIsObj = a.kind === 'nested' || a.kind === 'object';
            const bIsObj = b.kind === 'nested' || b.kind === 'object';
            if (aIsObj !== bIsObj) return aIsObj ? 1 : -1;
            return a.name.localeCompare(b.name);
        });

    const out: GraphQLFieldConfigMap<unknown, unknown> = {};
    for (const f of ordered) {
        const childPath = parentPath ? `${parentPath}.${f.name}` : f.name;
        out[f.name] = { type: gqlTypeForChild(f, extendedMap, parentName, childPath) };
    }
    return out;
}

function gqlTypeForChild(
    field: FieldNode,
    extendedMap: ExtendedMap,
    parentName: string,
    fieldPath: string,
): GraphQLOutputType {
    if (field.kind === 'scalar') {
        const base = gqlScalarFor(field.esType);
        const meta = extendedMap.get(fieldPath);
        return meta?.isArray ? new GraphQLList(base) : base;
    }
    const subName = `${parentName}${capFirst(field.name)}`;
    if (field.kind === 'object') {
        const childFieldMap = buildFieldMap({
            fields: field.fields,
            extendedMap,
            parentName: subName,
            parentPath: fieldPath,
        });
        return new GraphQLObjectType({
            name: subName,
            fields: () => childFieldMap,
        });
    }
    if (field.kind === 'nested') {
        const childFieldMap = buildFieldMap({
            fields: field.fields,
            extendedMap,
            parentName: subName,
            parentPath: fieldPath,
        });
        const family = buildConnectionFamily({
            name: subName,
            fieldMap: childFieldMap,
        });
        return family.wrapperType;
    }
    return GraphQLString;
}

type BuildConnectionFamilyArgs = {
    name: string;
    fieldMap: GraphQLFieldConfigMap<unknown, unknown>;
    // Entity-level only — controls which slice-T/U features the wrapper exposes.
    aggsType?: GraphQLObjectType;
    includeEntityMetadata?: boolean;
};

export type ConnectionFamily = {
    wrapperType: GraphQLObjectType;
    connectionType: GraphQLObjectType;
    edgeType: GraphQLObjectType;
    nodeType: GraphQLObjectType;
};

export function buildConnectionFamily(args: BuildConnectionFamilyArgs): ConnectionFamily {
    const { name, fieldMap, aggsType, includeEntityMetadata } = args;

    const nodeType = new GraphQLObjectType({
        name: `${name}Node`,
        interfaces: [NodeInterface],
        fields: () => ({
            id: { type: new GraphQLNonNull(GraphQLID) },
            score: { type: GraphQLInt },
            ...fieldMap,
        }),
    });

    const edgeType = new GraphQLObjectType({
        name: `${name}Edge`,
        fields: () => ({
            searchAfter: { type: GraphQLJSON },
            node: { type: nodeType },
        }),
    });

    const connectionType = new GraphQLObjectType({
        name: `${name}Connection`,
        fields: () => ({
            total: { type: new GraphQLNonNull(GraphQLInt) },
            edges: { type: new GraphQLList(edgeType) },
        }),
    });

    const wrapperType = new GraphQLObjectType({
        name,
        fields: () => {
            const out: GraphQLFieldConfigMap<unknown, unknown> = {
                hits: {
                    type: connectionType,
                    args: {
                        filters: { type: GraphQLJSON },
                        first: { type: GraphQLInt },
                        offset: { type: GraphQLInt },
                        sort: { type: new GraphQLList(SortInputType) },
                        searchAfter: { type: GraphQLJSON },
                    },
                },
            };
            if (aggsType) {
                out.aggregations = {
                    type: aggsType,
                    args: {
                        filters: { type: GraphQLJSON },
                        include_missing: { type: GraphQLBoolean },
                        aggregations_filter_themselves: { type: GraphQLBoolean },
                    },
                };
            }
            if (includeEntityMetadata) {
                out.extended = {
                    type: GraphQLJSON,
                    args: { fields: { type: new GraphQLList(GraphQLString) } },
                };
                out.columnsState = { type: ColumnsStateType };
            }
            return out;
        },
    });

    return { wrapperType, connectionType, edgeType, nodeType };
}

// Entry point for the entity-level family. Walks the FieldTree, emits all
// sub-types recursively, returns the entity wrapper type (the one that the
// Root.<entity> field is typed with).
type BuildEntityTypeArgs = {
    entityName: string;
    fields: FieldNode[];
    extendedMap: ExtendedMap;
    aggsType: GraphQLObjectType;
};

export function buildEntityType(args: BuildEntityTypeArgs): GraphQLObjectType {
    const { entityName, fields, extendedMap, aggsType } = args;
    const fieldMap = buildFieldMap({
        fields,
        extendedMap,
        parentName: entityName,
        parentPath: '',
    });
    const family = buildConnectionFamily({
        name: entityName,
        fieldMap,
        aggsType,
        includeEntityMetadata: true,
    });
    return family.wrapperType;
}
