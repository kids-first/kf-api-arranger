// ES scalar type → GraphQL scalar.
// Note: arranger maps `long`/`integer`/`short`/`byte` to `Float`, NOT `Int`.
// Almost certainly to avoid JS-side overflow on ES `long` (int64) which exceeds Number.MAX_SAFE_INTEGER.
// We match that exactly for byte-parity.

import { GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean } from 'graphql';

export const ES_TO_GQL_SCALAR = {
    // strings
    keyword: GraphQLString,
    text: GraphQLString,
    ip: GraphQLString,
    date: GraphQLString,
    // integers → Float (arranger's choice)
    long: GraphQLFloat,
    integer: GraphQLFloat,
    short: GraphQLFloat,
    byte: GraphQLFloat,
    // floats
    double: GraphQLFloat,
    float: GraphQLFloat,
    half_float: GraphQLFloat,
    // booleans
    boolean: GraphQLBoolean,
};

export function gqlScalarFor(esType) {
    const t = ES_TO_GQL_SCALAR[esType];
    if (!t) throw new Error(`Unsupported ES scalar type: ${esType}`);
    return t;
}

export { GraphQLInt };
