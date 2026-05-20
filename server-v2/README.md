# server-v2 — slice-S replacement for `@arranger/server`

Experiment-branch (`explore/post-arranger`) working slice that replaces
`@arranger/server` with a thin Apollo 5 + TypeScript layer. Schema is
generated from the same inputs arranger uses (ES mapping + arranger-projects
extended mapping). SQON-to-ES translation is delegated to
`@arranger/middleware`'s `buildQuery` (kept as a dep per the agreed stage-2
strategy).

## Pipeline

```
GraphQL query
  → Apollo Server 5
  → schema gen (TS, byte-parity with arranger across 7 entities)
  → resolver (Root.<entity> → <entity>.hits)
  → @arranger/middleware.buildQuery  (SQON → ES query DSL)
  → @elastic/elasticsearch v7.17
  → local ES 7.17.0
```

This README covers setup of the local ES + dev-server runtime. Slice-S
scope and what's intentionally not in it are in
`/tmp/.claude/projects/-workspace/memory/kfArranger_experiment_session3.md`
(read by claude across sessions) and the conversation history.

## Prerequisites

- Docker (compose v2)
- Node 22+
- `npm install` has been run inside this directory

## One-time: start ES and bootstrap an entity's index

```bash
# 1. Start local Elasticsearch (7.17.0, single-node, port 9200, no auth)
docker compose up -d

# 2. Wait until healthy (~10s on first start)
docker compose ps          # status should show "healthy"

# 3. Create the backing index + alias for one entity
#    (uses the fixture mapping from experiments/data/mappings/)
npm run es:bootstrap study_centric
```

The bootstrap creates index `study_centric_local_1` with the production
mapping and binds alias `study_centric → study_centric_local_1`. Re-run
`es:bootstrap` for any other entity you want available locally
(`participant_centric`, `file_centric`, etc.) — the script is idempotent
(deletes the backing index if it already exists, then recreates it).

### Index settings (analyzers / normalizers)

If a mapping references custom analyzers or normalizers (e.g. fields with
`"normalizer": "custom_normalizer"` — visible across most KF/INCLUDE
indices), the bootstrap will fail with `unknown normalizer` unless the
matching settings are also provided. Drop the `GET <index>/_settings`
response from QA into:

```
experiments/data/settings/<es_index>.json
```

The bootstrap script auto-loads it if present and includes it in the PUT
body. Currently `study_centric.json` is on disk; for other entities add
the same shape if you hit a normalizer error.

## Each refresh: load sample documents

Sample documents live at `experiments/data/samples/<es_index>.json` as a
JSON array. The loader accepts either shape:

- **Full-hit shape** (raw Kibana paste): `[ { "_index": ..., "_id": ..., "_source": { ... } }, ... ]`
- **Source-only shape**: `[ { ...source fields... }, ... ]`

For full-hit shape the loader uses the original `_id` from each hit. For
source-only shape it falls back to the `primaryKey` field from the
arranger-projects extended mapping (e.g. `study_id` for `study_centric`).
Re-running is idempotent in both cases.

To refresh:

1. **In QA Kibana**, query the index:

   ```
   GET study_centric/_search
   { "size": 200, "query": { "match_all": {} } }
   ```

2. **Copy `.hits.hits` (the array of full hits)** and paste it into
   `experiments/data/samples/study_centric.json`, replacing the existing
   `[]`. The loader also strips Kibana's `"""..."""` Python-style heredocs
   (which break `JSON.parse`) before processing.

3. **Load from `server-v2/`:**

   ```bash
   npm run es:load study_centric
   ```

## Verify

```bash
curl -s http://localhost:9200/study_centric/_count
curl -s "http://localhost:9200/study_centric/_search?size=1" \
    | jq '.hits.hits[0]._source | keys[:5]'
```

The first prints `{"count": N, ...}`; the second confirms the alias
resolves and shows 5 field names from a real doc.

## Run the server

```bash
npm run dev
```

Default port is 4000. Startup pings the ES cluster (fail-fast). Expect:

```
ES cluster status: yellow
nested fields (N): clinical_trials, contacts, data_types, ...
server-v2 ready at http://localhost:4000/ (entity: study, real ES)
```

### Try a query

```bash
# Read path — first 5 hits
curl -sX POST http://localhost:4000/ -H 'Content-Type: application/json' \
  -d '{"query":"{ study { hits(first: 5) { total edges { node { id study_id study_name } } } } }"}' | jq

# With a SQON filter — IN op on a top-level field
curl -sX POST http://localhost:4000/ -H 'Content-Type: application/json' \
  -d '{"query":"query Q($f: JSON){ study { hits(filters:$f) { total edges { node { study_id } } } } }",
       "variables":{"f":{"op":"in","content":{"field":"study_id","value":["APAP21"]}}}}' | jq

# SQON with __missing__ magic — docs where `note` is unset
curl -sX POST http://localhost:4000/ -H 'Content-Type: application/json' \
  -d '{"query":"query Q($f: JSON){ study { hits(filters:$f) { total } } }",
       "variables":{"f":{"op":"in","content":{"field":"note","value":["__missing__"]}}}}' | jq

# SQON on a nested field — contacts is a `nested` type in the ES mapping
curl -sX POST http://localhost:4000/ -H 'Content-Type: application/json' \
  -d '{"query":"query Q($f: JSON){ study { hits(filters:$f) { total edges { node { study_id } } } } }",
       "variables":{"f":{"op":"in","content":{"field":"contacts.institution","value":["University of Miami"]}}}}' | jq
```

### Known quirk faithful to arranger

`not-in` on a nested field returns ">= 1 nested doc not matching", not
"no nested doc matching". This is how arranger's `buildQuery` wraps
negation under nested paths in both 2.19.2 and `main`. The frontend
either avoids this case or accepts the looser semantic.

## Stop

```bash
docker compose down       # stops; data volume preserved
docker compose down -v    # stops; data volume dropped
```
