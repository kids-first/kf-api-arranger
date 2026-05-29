# kf-api-arranger

GraphQL + REST API over Elasticsearch for the Kids First and INCLUDE portals.

## 🏗️ Architecture

Two HTTP surfaces under one process:

- **REST routes** at the app root (`/status`, `/statistics`, `/sets`, `/phenotypes`, `/upset`, `/venn`, `/transcriptomics/*`, etc.) — most are Keycloak-gated.
- **GraphQL endpoint** at `/<projectId>/graphql` — backed by a vendored SQON → ES query/aggregation pipeline (`src/sqon/`).

Reads Elasticsearch across 7 entity `_centric` indices (participants, files, biospecimens, variants, genes, studies, specimen tree). Sets persistence is delegated to a separate users-api service over HTTP.

Boot is fail-fast: a missing or unreachable `ES_HOST` exits at startup. Per-route env vars (e.g. a missing suggestion index) only block their own route.

## 📋 Requirements

- **Node 24+** — matches `engines.node` and the prod image
- **Docker + Docker Compose** — for the containerized dev workflow
- Reachable **Elasticsearch** cluster, **Keycloak** realm, and **users-api** instance

## 🚀 Quick start

```bash
cp .env.example .env
# fill in ES_HOST, KEYCLOAK_*, USER_API_URL, etc.
```

### Containerized (recommended)

```bash
docker compose up app                # dev mode, hot reload
docker compose run --rm test         # test suite
```

For an interactive shell with the project mounted (poke around, run any script manually):

```bash
docker run --rm -it --network host -v "$PWD:/app" -w /app node:24-alpine3.22 sh
```

Inside the shell: `npm install && npm run dev` (or any other script). `--network host` lets the container reach host-bound services like SSH tunnels at `localhost:<port>`.

### Local (host Node 24)

```bash
npm install
npm run dev          # tsx watch — hot reload
npm run test         # vitest run
npm run lint         # biome check
npm run lint:fix     # biome check --write
```

## 🔐 Environment variables

See `.env.example` for the keys to set and `src/env.ts` for defaults and which are boot-fatal vs route-fatal.

The critical knobs:

- `ES_HOST` — boot-fatal if unreachable
- `KEYCLOAK_URL` / `KEYCLOAK_REALM` / `KEYCLOAK_CLIENT` — must match the FE's KC client so token audience validates
- `USER_API_URL` — sets persistence
- `PROJECT_ID` — GraphQL mount prefix

## 📂 Project layout

- `src/app.ts` — REST routes, auth gates, mount points
- `src/index.ts` — boot orchestration
- `src/graphql/` — GraphQL schema + Apollo server
- `src/sqon/` — in-tree SQON → ES query/aggregation builder
- `src/endpoints/` — REST route handlers
- `ops/` — release-time ES alias rotation helpers (see each file's header)

## 🩺 Health check

`GET /status` returns 200 with a minimal JSON sanity payload (Keycloak URL, ES host, users-api URL). No auth required. Use it as your orchestrator's liveness probe.

## 📜 License

Apache 2.0
