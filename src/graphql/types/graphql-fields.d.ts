// Minimal ambient typings for graphql-fields.
// The package ships no types and there's no @types pkg. We only declare the
// shape we actually use: a default export taking GraphQLResolveInfo and
// returning a nested tree of requested fields (leaves are empty objects).
//
// Reference: https://github.com/robrichard/graphql-fields
//   graphqlFields(info, obj = {}, opts = { processArguments, excludedFields }) → FieldsTree

declare module 'graphql-fields' {
    import type { GraphQLResolveInfo } from 'graphql';

    export type FieldsTree = { [field: string]: FieldsTree };

    type Options = {
        processArguments?: boolean;
        excludedFields?: string[];
    };

    export default function graphqlFields(
        info: GraphQLResolveInfo,
        obj?: Record<string, unknown>,
        opts?: Options,
    ): FieldsTree;
}
