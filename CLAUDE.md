# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # tsx watch — hot reload (requires .env populated, see src/env.ts)
npm run test         # vitest run (whole suite)
npm run test -- src/path/to/file.test.ts        # single file
npm run test:watch                              # vitest in watch mode
npm run lint         # biome check .
npm run lint:fix     # biome check --write .
npm run typecheck    # tsc --noEmit
npm run build        # tsc --build into dist/
```

Always run `npm run lint` and `npm run typecheck` after code changes and fix findings in the same iteration. The containerized workflow (`docker compose up app` / `docker compose run --rm test`) is the supported dev path — see `README.md` for env setup.

## Architecture

### Two HTTP surfaces, one Express process

`src/index.ts` boots one Express app that serves both REST and GraphQL:

- **REST routes** at the app root, defined in `src/app.ts`, handlers under `src/endpoints/`. Most are Keycloak-gated.
- **GraphQL** mounted at `/${PROJECT_ID}/graphql`, built by `src/graphql/server.ts`.

Single project per deployment — `PROJECT_ID` env var picks the mount prefix (default `include`). Apollo 5 + `@as-integrations/express5`.

### `runInternalQuery` shim

`src/arrangerUtils.ts` exposes a function that runs a GraphQL query against our own schema **in-process** (direct `graphql()` call, no HTTP hop). Built once at boot and threaded into the Express app. The `/sets` and `/phenotypes` REST routes use this to compose GraphQL aggregations without going through Apollo's HTTP layer. When editing those routes, expect the query string to be parsed by the same schema the public endpoint serves.

### Boot is fail-fast and schema-derived

`buildGraphqlServer()` fetches `_mapping` from ES for all 7 `_centric` indices in parallel and derives the GraphQL schema from those mappings at startup. A missing or unreachable `ES_HOST` exits the process. The 7 entities and their GraphQL names are hard-coded in `src/graphql/server.ts:ES_ENTITIES` because the entity name isn't derivable from the index name (`variant_centric` → `variants`, `specimen_tree_centric` → `biospecimen_trees`, etc.).

`extended` field metadata (formerly stored in an `arranger-projects-*` ES doc) is now derived from `_mapping` plus a `meta.isArray` annotation that the ETL is expected to set. A fallback hard-coded list of multi-value paths exists for fields the ETL hasn't tagged yet — a one-line `[arrayFieldsFallback]` log at boot reports how many paths still need ETL annotation per entity. Silent when ETL has caught up.

### Vendored SQON pipeline under `src/sqon/`

The codebase previously depended on `@arranger/middleware` for SQON → ES query/aggregation translation. That dependency was removed; `src/sqon/buildQuery/`, `src/sqon/buildAggregations/`, and `src/sqon/flattenAggregations.ts` are clean-room reimplementations **aligned with arranger 2.19.4** (not v3 — there are material behavioral differences in `field`/`fieldName`, `getMissingFilter` isNot semantics, RANGE flattening, etc.). Don't port v3 patterns into this code.

`src/sqon/setSqon.ts` resolves `set_id:` references in SQONs by calling the external users-api before the SQON hits ES.

### ES client pinning quirk

`@elastic/elasticsearch` is pinned at exactly `7.13.0`. Versions 7.14+ added a product check that throws on OpenSearch backends (KF QA runs OpenSearch). Do not bump this dep without replacing it with a fetch-based shim or the `@opensearch-project/opensearch` client. See `src/es/realClient.ts` for the full story.

### Sets persistence is external

There is no local DB. User-created sets live in a separate users-api service reached over HTTP (`src/userApi/userApiClient.ts`, configured via `USER_API_URL`). The `/sets` REST route is a thin orchestration layer that fetches/mutates sets there and then runs GraphQL aggregations against ES via `runInternalQuery`.

## Conventions

- **Relative imports must carry the `.js` suffix.** `tsconfig.json` uses `moduleResolution: nodenext`; `import './foo'` will fail at runtime. This also applies to `vi.mock()` paths inside tests.
- **Tests use vitest with `globals: true`** (see `vitest.config.ts`). `describe`/`it`/`expect`/`beforeEach` are ambient; `vi` is imported explicitly by convention.
- **Biome handles lint + format + import organization** — there is no eslint or prettier. `biome.json` is the single source of truth.
- **HTTP status codes** are named constants in `src/httpStatus.ts`. Don't introduce bare numbers in new `res.status(...)` calls.
- **No `@arranger/*` packages.** If you find yourself reaching for one, you're going the wrong direction — extend the in-tree SQON code instead.

## Operational notes

- `GET /status` is the liveness probe (unauthenticated, 200 + a small JSON sanity payload).
- The `admin/` directory contains release-time ES alias rotation scripts (`postReleaseIndicesToAliasesHelper.mjs` etc.) that run outside the server. Each script has a self-describing header — read it before invoking.
- `PORT` defaults to 5050 (local-dev only). Production sets it via env.
