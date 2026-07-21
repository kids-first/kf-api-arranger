export type Content = any;
//A poor' s man sqon type.
export type Sqon = {
    op: string;
    content: Content;
    [key: string]: any;
};

// Shared shapes for ES query bodies and aggregation trees. Both are loose
// `Record<string, any>` by design — the structure is dictated by ES and
// composed dynamically from SQON ops, so static typing buys little.
export type EsQuery = Record<string, any>;
export type EsAggs = Record<string, any>;
