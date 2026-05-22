// Shared CASES — consumed by fetch-baselines.mjs (to populate baselines.json
// from a real arranger) and by diff-real.mjs (to compare server-v2 against
// those baselines).
//
// Case shape:
//   {
//     name:   'short label',
//     query:  '<GraphQL string>'  // or  { query, variables }
//     ignore: ['$.path.to.skip'],  // prefix-match — see filterIgnore() in diff-real.mjs
//   }
//
// No `expected` field — baselines come from baselines.json (written by
// fetch-baselines.mjs). For a case not present in baselines.json, diff-real
// falls back to CAPTURE mode (prints server-v2's response only).

export const CASES = [
    {
        name: 'S: participant hits scalars',
        query: `{
            participant {
                hits(first: 2) {
                    total
                    edges { node { participant_id sex } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'T-stats: study biospecimen_count stats',
        query: `{
            study {
                aggregations {
                    biospecimen_count { stats { count min max avg sum } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'T-buckets: study domains buckets',
        query: `{
            study {
                aggregations {
                    domains { buckets { key doc_count } }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'U-extended: participant extended (length spot-check)',
        query: `{ participant { extended } }`,
        ignore: [],
    },

    {
        name: 'U-columnsState: frontend reports query for participant',
        query: `query columnsStateQuery {
            participant {
                columnsState {
                    state {
                        type
                        keyField
                        defaultSorted { id desc }
                        columns { field accessor show type sortable canChangeShow query jsonPath }
                    }
                }
            }
        }`,
        ignore: [],
    },

    {
        name: 'V-single: study contacts hits.edges',
        query: `{
            study {
                hits(first: 3) {
                    edges {
                        node {
                            study_code
                            contacts {
                                hits {
                                    total
                                    edges { node { name email institution } }
                                }
                            }
                        }
                    }
                }
            }
        }`,
        ignore: [],
    },
];
