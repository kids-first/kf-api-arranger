// Re-export the well-known JSON scalar used by arranger.
// We use the upstream `graphql-type-json` package rather than rolling our own
// for compatibility — arranger uses the same package, so consumers built
// against arranger's `JSON` scalar will see the same behavior.

// Note: `graphql-type-json` is a CJS package. Under ESM, the *default* import
// resolves to the namespace object (no `name` property → GraphQL schema build
// asserts). Use the named import to bind the scalar directly.
import { GraphQLJSON } from 'graphql-type-json';

export { GraphQLJSON };
