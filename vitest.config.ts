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
    test: {
        include: ['src/**/*.test.ts'],
        exclude: ['dist/**', 'node_modules/**'],
        environment: 'node',
        globals: true,
    },
});
