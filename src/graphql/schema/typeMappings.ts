// ES scalar type → GraphQL scalar.
// Note: arranger maps `long`/`integer`/`short`/`byte` to `Float`, NOT `Int`, to
// avoid JS-side overflow on ES `long` (int64) > Number.MAX_SAFE_INTEGER.
// We match that exactly for byte-parity with arranger's emitted SDL.

import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLString } from 'graphql';
import type { GraphQLScalarType } from 'graphql';
import type { ScalarEsType } from './types.js';

export const ES_TO_GQL_SCALAR: Readonly<Record<ScalarEsType, GraphQLScalarType>> = {
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
