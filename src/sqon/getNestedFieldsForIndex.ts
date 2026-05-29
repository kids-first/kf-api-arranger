import type { Client } from '@elastic/elasticsearch';

// Recursive walker over ES mapping `properties`. Returns dotted paths of
// every field with `type: 'nested'`. Vendored to drop the
// `@arranger/mapping-utils` dep — its peer-pinned graphql@^14 conflicted
// with our graphql@^16 bump.
type MappingProperty = {
    type?: string;
    properties?: Record<string, MappingProperty>;
};

const getNestedFields = (properties: Record<string, MappingProperty> | undefined, prefix = ''): string[] => {
    if (!properties) return [];
    const out: string[] = [];
    for (const [name, def] of Object.entries(properties)) {
        const path = prefix ? `${prefix}.${name}` : name;
        if (def?.type === 'nested') out.push(path);
        if (def?.properties) out.push(...getNestedFields(def.properties, path));
    }
    return out;
};

type MappingResponseEntry = { mappings: { properties: Record<string, MappingProperty> } };

export const getNestedFieldsForIndex = async (client: Client, indexName: string): Promise<string[]> => {
    const rM = await client.indices.getMapping({ index: indexName });
    const entries = Object.values((rM.body || {}) as Record<string, MappingResponseEntry>);
    return getNestedFields(entries[0]?.mappings?.properties);
};
