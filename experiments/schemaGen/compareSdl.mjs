// Extract a single type definition by name from a full SDL string, and diff two such blocks.
// Normalization: sort fields alphabetically within the type so insertion order doesn't matter.

export function extractNodeType(sdl, typeName) {
    // Match `type <typeName>` optionally followed by `implements <iface>` then `{ ... }`
    const re = new RegExp(`^type ${escapeRe(typeName)}(?:\\s+implements\\s+[^{]+)?\\s*\\{[^}]*\\}`, 'm');
    const m = sdl.match(re);
    if (!m) throw new Error(`Could not find "type ${typeName}" in SDL`);
    return m[0];
}

export function diffNodeTypes(a, b) {
    const aFields = parseTypeBlock(a);
    const bFields = parseTypeBlock(b);

    const aKeys = new Set(aFields.keys());
    const bKeys = new Set(bFields.keys());

    const onlyInA = [...aKeys].filter(k => !bKeys.has(k));
    const onlyInB = [...bKeys].filter(k => !aKeys.has(k));
    const inBoth = [...aKeys].filter(k => bKeys.has(k));
    const typeMismatched = inBoth.filter(k => aFields.get(k) !== bFields.get(k));

    const matchPct = aKeys.size
        ? Math.round((inBoth.length - typeMismatched.length) / aKeys.size * 100)
        : 0;

    const summary = [
        `arranger field count: ${aKeys.size}`,
        `ours field count:     ${bKeys.size}`,
        `present in both:      ${inBoth.length}`,
        `type-mismatched:      ${typeMismatched.length}`,
        `missing from ours:    ${onlyInA.length}`,
        `extra in ours:        ${onlyInB.length}`,
        `exact match rate:     ${matchPct}%`,
    ].join('\n');

    const lines = [];
    if (onlyInA.length) {
        lines.push('\nMissing from ours (in arranger only):');
        for (const k of onlyInA) lines.push(`  - ${k}: ${aFields.get(k)}`);
    }
    if (onlyInB.length) {
        lines.push('\nExtra in ours (not in arranger):');
        for (const k of onlyInB) lines.push(`  + ${k}: ${bFields.get(k)}`);
    }
    if (typeMismatched.length) {
        lines.push('\nType mismatches:');
        for (const k of typeMismatched) {
            lines.push(`  ! ${k}:  arranger=${aFields.get(k)}  ours=${bFields.get(k)}`);
        }
    }

    return { summary, unifiedDiff: lines.length ? lines.join('\n') : '' };
}

// Parse "type X { a: Y\n b: [Z]\n }" into Map(name → typeString).
// Implements/header lines and braces are ignored.
function parseTypeBlock(block) {
    const fieldRe = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\([^)]*\))?\s*:\s*([^\n]+)\s*$/;
    const out = new Map();
    for (const line of block.split('\n')) {
        const m = line.match(fieldRe);
        if (m) out.set(m[1], m[2].trim());
    }
    return out;
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
