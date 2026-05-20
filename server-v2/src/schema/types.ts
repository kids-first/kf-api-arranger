// Internal types for the schema generator.
// Mirrors the structure used by the byte-parity-proven .mjs experiment in
// experiments/schemaGen/, ported to TS.

export type ScalarEsType =
    | 'keyword' | 'text' | 'ip'
    | 'long' | 'integer' | 'short' | 'byte'
    | 'double' | 'float' | 'half_float'
    | 'boolean'
    | 'date';

export type ScalarField = {
    kind: 'scalar';
    name: string;
    esType: ScalarEsType;
};

export type ObjectField = {
    kind: 'object';
    name: string;
    fields: FieldNode[];
};

export type NestedField = {
    kind: 'nested';
    name: string;
    fields: FieldNode[];
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

// One entry from the arranger-projects-<project> doc's _source.config.extended array.
// We only type the fields we use; other fields are present on the wire but ignored.
export type ExtendedEntry = {
    field: string;
    type: string;
    isArray: boolean;
    active: boolean;
    displayName?: string;
    primaryKey?: boolean;
};

export type ExtendedMap = Map<string, ExtendedEntry>;
