// Internal types for the schema generator.
// Mirrors the structure used by the byte-parity-proven .mjs experiment in
// experiments/schemaGen/, ported to TS.

export type ScalarEsType =
    | 'keyword'
    | 'text'
    | 'ip'
    | 'long'
    | 'integer'
    | 'short'
    | 'byte'
    | 'double'
    | 'float'
    | 'half_float'
    | 'boolean'
    | 'date';

// `meta` mirrors ES per-field `meta` (mappings.properties.<field>.meta).
// Always string→string in ES; max 5 entries, key ≤20 chars, value ≤50 chars.
// We currently only read `isArray: "true"` here — set by the ETL on fields
// that hold multi-value scalars (ES native mapping doesn't distinguish them
// from single-value scalars).
export type FieldMeta = Record<string, string>;

export type ScalarField = {
    kind: 'scalar';
    name: string;
    esType: ScalarEsType;
    meta?: FieldMeta;
};

export type ObjectField = {
    kind: 'object';
    name: string;
    fields: FieldNode[];
    meta?: FieldMeta;
};

export type NestedField = {
    kind: 'nested';
    name: string;
    fields: FieldNode[];
    meta?: FieldMeta;
};

export type UnsupportedField = {
    kind: 'unsupported';
    name: string;
    esType: string;
};

export type FieldNode = ScalarField | ObjectField | NestedField | UnsupportedField;

export type FieldTree = {
    indexName: string;
    fields: FieldNode[];
};

// One entry in the per-entity `extended` array surfaced to the FE. Mirrors
// the shape of the legacy arranger-projects-* sidecar doc, narrowed to the
// fields we actually emit. (Arranger's wire also includes unused extras
// like `unit`, `displayValues`, `quickSearchEnabled`, `rangeStep`, `gqlId`
// — FE doesn't consume those per the field audit, so we don't emit them.)
export type ExtendedEntry = {
    field: string;
    type: string;
    isArray: boolean;
    active: boolean;
    displayName?: string;
    primaryKey?: boolean;
};

export type ExtendedMap = Map<string, ExtendedEntry>;

// What `deriveExtended` returns per entity.
export type DerivedExtended = {
    map: ExtendedMap;
    entries: ExtendedEntry[];
    columnsState: unknown;
    entityName: string;
};
