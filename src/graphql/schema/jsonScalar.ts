// Re-export the well-known `JSON` scalar from `graphql-type-json`.

// Note: `graphql-type-json` is a CJS package. Under ESM, the *default* import
// resolves to the namespace object (no `name` property → GraphQL schema build
// asserts). Use the named import to bind the scalar directly.
import { GraphQLJSON } from 'graphql-type-json';

export { GraphQLJSON };
