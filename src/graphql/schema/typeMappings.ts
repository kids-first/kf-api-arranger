// ES scalar type → GraphQL scalar.
// `long`/`integer`/`short`/`byte` map to `Float`, not `Int`, to avoid JS-side
// overflow on ES `long` (int64) > Number.MAX_SAFE_INTEGER. This is also the
// shape the FE expects on the GraphQL contract.

import type { GraphQLScalarType } from 'graphql';
import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLString } from 'graphql';
import type { ScalarEsType } from './types.js';

const ES_TO_GQL_SCALAR: Readonly<Record<ScalarEsType, GraphQLScalarType>> = {
    keyword: GraphQLString,
    text: GraphQLString,
    ip: GraphQLString,
    date: GraphQLString,
    long: GraphQLFloat,
    integer: GraphQLFloat,
    short: GraphQLFloat,
    byte: GraphQLFloat,
    double: GraphQLFloat,
    float: GraphQLFloat,
    half_float: GraphQLFloat,
    boolean: GraphQLBoolean,
};

export function gqlScalarFor(esType: ScalarEsType): GraphQLScalarType {
    const t = ES_TO_GQL_SCALAR[esType];
    if (!t) throw new Error(`Unsupported ES scalar type: ${esType}`);
    return t;
}

export { GraphQLInt };
