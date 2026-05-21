// Builds the <entity>Aggregations GraphQLObjectType — one field per leaf
// scalar mapping field, named via `__` flatten (e.g. study.study_code →
// study__study_code), dispatched via ES type → agg-type table.
//
// Mirrors arranger's mapping-utils/src/mappingToAggsType.js + esToAggTypeMap.js.
// `object` and `nested` parents are walked the same way — nested-ness is
// encoded later by the resolver (via @arranger/middleware.buildAggregations),
// not in the schema.

import { GraphQLObjectType } from 'graphql';
import type { GraphQLFieldConfigMap } from 'graphql';
import { Aggregations, NumericAggregations } from './aggsTypes.js';
import type { FieldNode, FieldTree, ScalarEsType } from './types.js';

// Verbatim from arranger's esToAggTypeMap.js, restricted to the ES types our
// fieldTree currently accepts. `ip` isn't in arranger's table — we default
// it to Aggregations (keyword-like) rather than crashing.
const ES_TO_AGG_TYPE: Readonly<Record<ScalarEsType, GraphQLObjectType>> = {
    keyword: Aggregations,
    text: Aggregations,
    ip: Aggregations,
    boolean: Aggregations,
    long: NumericAggregations,
    integer: NumericAggregations,
    short: NumericAggregations,
    byte: NumericAggregations,
    double: NumericAggregations,
    float: NumericAggregations,
    half_float: NumericAggregations,
    date: NumericAggregations,
};

export function buildAggsType(tree: FieldTree, entityName: string): GraphQLObjectType {
    return new GraphQLObjectType({
        name: `${entityName}Aggregations`,
        fields: () => {
            const out: GraphQLFieldConfigMap<unknown, unknown> = {};
            walk(tree.fields, '', out);
            return out;
        },
    });
}

function walk(
    fields: FieldNode[],
    prefix: string,
    out: GraphQLFieldConfigMap<unknown, unknown>,
): void {
    for (const f of fields) {
        if (f.kind === 'unsupported') continue;
        const flatName = prefix ? `${prefix}__${f.name}` : f.name;
        if (f.kind === 'scalar') {
            out[flatName] = { type: ES_TO_AGG_TYPE[f.esType] };
        } else {
            walk(f.fields, flatName, out);
        }
    }
}
