// Walks an ES mapping JSON and produces an internal field tree.
// Input: raw `_mapping` response, shape: { [indexName]: { mappings: { properties } } }
// Output: { indexName, fields: Field[] }
//
// Field = { kind: 'scalar', name, esType }
//       | { kind: 'object', name, fields: Field[] }
//       | { kind: 'nested', name, fields: Field[] }
//       | { kind: 'unsupported', name, esType }

const SUPPORTED_SCALARS = new Set([
    'keyword', 'text', 'ip',
    'long', 'integer', 'short', 'byte',
    'double', 'float', 'half_float',
    'boolean',
    'date',
]);

export function buildFieldTree(mappingJson) {
    const indexName = Object.keys(mappingJson)[0];
    const props = mappingJson[indexName].mappings.properties;
    return { indexName, fields: walkProperties(props) };
}

function walkProperties(props) {
    return Object.entries(props).map(([name, def]) => walkField(name, def));
}

function walkField(name, def) {
    if (def.type === 'nested') {
        return { kind: 'nested', name, fields: def.properties ? walkProperties(def.properties) : [] };
    }
    if (def.properties) {
        return { kind: 'object', name, fields: walkProperties(def.properties) };
    }
    if (def.type && SUPPORTED_SCALARS.has(def.type)) {
        return { kind: 'scalar', name, esType: def.type };
    }
    return { kind: 'unsupported', name, esType: def.type ?? '(no type)' };
}
