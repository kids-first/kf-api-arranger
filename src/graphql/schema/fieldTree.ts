// Walks an ES _mapping JSON and produces an internal field tree.
// Input shape:  { [indexName]: { mappings: { properties: { ... } } } }

import type { FieldNode, FieldTree, ScalarEsType } from './types.js';

const SUPPORTED_SCALARS = new Set<ScalarEsType>([
    'keyword',
    'text',
    'ip',
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'boolean',
    'date',
]);

type RawField = {
    type?: string;
    properties?: Record<string, RawField>;
    meta?: Record<string, string>;
};

type RawMapping = {
    [indexName: string]: {
        mappings: { properties: Record<string, RawField> };
    };
};

export function buildFieldTree(mappingJson: RawMapping): FieldTree {
    const indexName = Object.keys(mappingJson)[0];
    if (!indexName) throw new Error('mapping JSON has no top-level index key');
    const props = mappingJson[indexName].mappings.properties;
    return { indexName, fields: walkProperties(props) };
}

function walkProperties(props: Record<string, RawField>): FieldNode[] {
    return Object.entries(props).map(([name, def]) => walkField(name, def));
}

function walkField(name: string, def: RawField): FieldNode {
    if (def.type === 'nested') {
        return {
            kind: 'nested',
            name,
            fields: def.properties ? walkProperties(def.properties) : [],
            ...(def.meta && { meta: def.meta }),
        };
    }
    if (def.properties) {
        return {
            kind: 'object',
            name,
            fields: walkProperties(def.properties),
            ...(def.meta && { meta: def.meta }),
        };
    }
    if (def.type && isSupportedScalar(def.type)) {
        return {
            kind: 'scalar',
            name,
            esType: def.type,
            ...(def.meta && { meta: def.meta }),
        };
    }
    return { kind: 'unsupported', name, esType: def.type ?? '(no type)' };
}

function isSupportedScalar(t: string): t is ScalarEsType {
    return (SUPPORTED_SCALARS as Set<string>).has(t);
}

// Collect dotted paths of all `nested`-type fields in the tree.
// Used by buildQuery to know which paths need ES `nested` query wrapping.
export function collectNestedFields(tree: FieldTree): string[] {
    const out: string[] = [];
    const walk = (fields: FieldNode[], prefix: string): void => {
        for (const f of fields) {
            const path = prefix ? `${prefix}.${f.name}` : f.name;
            if (f.kind === 'nested') {
                out.push(path);
                walk(f.fields, path);
            } else if (f.kind === 'object') {
                walk(f.fields, path);
            }
        }
    };
    walk(tree.fields, '');
    return out;
}
