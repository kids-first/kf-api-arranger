// Vitest config — ESM-native, Vite/esbuild handles TS transformation. No
// transformer config (formerly ts-jest), no moduleNameMapper for the .js
// suffix in TS-ESM imports — Vitest resolves transparently.
//
// `globals: true` makes describe/it/expect/beforeAll/afterAll/beforeEach
// available without imports, matching the existing test-file style. `vi`
// is also exposed globally, so the `import { vi } from 'vitest'` line in
// test files is optional. We keep it explicit in a few places for IDE
// IntelliSense; both forms work.

import { defineConfig } from 'vitest/config';

export default defineConfig({
    // graphql ships parallel CJS/ESM copies and declares no `exports` map, so
    // Vite picks `module` (index.mjs) while node — in prod, and for CJS deps
    // like graphql-type-json — loads `main`. Pin tests to the copy node uses;
    // two copies make every instanceof check across the boundary throw.
    resolve: { alias: { graphql: 'graphql/index.js' } },
    test: {
        include: ['src/**/*.test.ts'],
        exclude: ['dist/**', 'node_modules/**'],
        environment: 'node',
        globals: true,
    },
});
