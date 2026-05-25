// Tests compile to CJS via ts-jest (override `module: commonjs` on the
// per-transform tsconfig). The runtime tsconfig stays ESM —
// this override only applies to jest. Reasons:
//   - CJS jest auto-stubs named exports on `jest.mock('./foo')`, which is
//     the pattern every existing test file uses. ESM jest doesn't (would
//     require migrating every file to `jest.unstable_mockModule` + dynamic
//     imports).
//   - Our source is ESM-shaped (.js extension on relative imports, JSON
//     import attribute in app.ts). ts-jest in CJS mode emits standard
//     `require()` and Node natively handles both — the `with { type:
//     'json' }` clause is stripped on compile to CJS.
//   - No test file imports src/index.ts (which has top-level await — the
//     only true ESM-only construct in the codebase).
//
// moduleNameMapper strips the `.js` suffix from relative imports so jest's
// resolver finds the .ts source.

/** @type {import('jest').Config} */
export default {
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: {
                    module: 'commonjs',
                    moduleResolution: 'node',
                    target: 'ES2022',
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                    resolveJsonModule: true,
                    skipLibCheck: true,
                },
            },
        ],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['**/src/**/*.test.(ts|js)'],
    testEnvironment: 'node',
    modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
