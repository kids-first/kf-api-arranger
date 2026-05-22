#!/usr/bin/env node
// Diff server-v2 vs baselines captured from a real arranger.
//
//   node scripts/diff-real.mjs                 # run all cases
//   node scripts/diff-real.mjs <substring>     # filter cases by name
//
// Override server-v2 endpoint with: SERVER_V2_URL=http://other-host:port
//
// Workflow
// --------
// 1. Start a local arranger pointing at ES QA (avoids prod Keycloak).
// 2. `node scripts/fetch-baselines.mjs` → writes scripts/baselines.json.
// 3. `node scripts/diff-real.mjs` → diffs server-v2 against those baselines.
//
// Cases without a baseline (case name not in baselines.json) run in CAPTURE
// mode — prints server-v2's actual response. Useful for adding new cases
// before refreshing baselines.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.mjs';

const ENDPOINT = process.env.SERVER_V2_URL ?? 'http://localhost:4000/';
const FILTER = process.argv[2];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASELINES_PATH = path.join(__dirname, 'baselines.json');

let baselines = {};
if (fs.existsSync(BASELINES_PATH)) {
    baselines = JSON.parse(fs.readFileSync(BASELINES_PATH, 'utf8'));
}

async function gqlPost(query) {
    const body = typeof query === 'string' ? { query } : query;
    const t0 = Date.now();
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    return { json, ms: Date.now() - t0 };
}

function deepDiff(actual, expected, path = '$') {
    if (actual === expected) return [];
    if (actual === null || expected === null) {
        if (actual === expected) return [];
        return [{ path, kind: 'null-mismatch', actual, expected }];
    }
    if (typeof actual !== typeof expected) {
        return [{
            path, kind: 'type',
            actual: typeof actual, expected: typeof expected,
            actualVal: actual, expectedVal: expected,
        }];
    }
    if (typeof actual !== 'object') {
        if (actual !== expected) return [{ path, kind: 'scalar', actual, expected }];
        return [];
    }
    const aArr = Array.isArray(actual);
    const eArr = Array.isArray(expected);
    if (aArr !== eArr) {
        return [{ path, kind: 'shape', actual: aArr ? 'array' : 'object', expected: eArr ? 'array' : 'object' }];
    }
    const diffs = [];
    if (aArr) {
        if (actual.length !== expected.length) {
            diffs.push({ path: `${path}.length`, kind: 'length', actual: actual.length, expected: expected.length });
        }
        const max = Math.max(actual.length, expected.length);
        for (let i = 0; i < max; i++) {
            diffs.push(...deepDiff(actual[i], expected[i], `${path}[${i}]`));
        }
        return diffs;
    }
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    for (const k of keys) {
        if (!has(actual, k)) diffs.push({ path: `${path}.${k}`, kind: 'missing-in-actual', expected: expected[k] });
        else if (!has(expected, k)) diffs.push({ path: `${path}.${k}`, kind: 'unexpected-in-actual', actual: actual[k] });
        else diffs.push(...deepDiff(actual[k], expected[k], `${path}.${k}`));
    }
    return diffs;
}

function filterIgnore(diffs, ignore) {
    if (!ignore?.length) return diffs;
    return diffs.filter(d => !ignore.some(prefix =>
        d.path === prefix ||
        d.path.startsWith(prefix + '.') ||
        d.path.startsWith(prefix + '['),
    ));
}

function trunc(v, max = 80) {
    const s = JSON.stringify(v);
    if (s == null) return String(v);
    return s.length > max ? s.slice(0, max) + '…' : s;
}

function summarizeDiff(d) {
    switch (d.kind) {
        case 'scalar':              return `${d.path}: ${trunc(d.actual)}  ≠  ${trunc(d.expected)}`;
        case 'length':              return `${d.path}: ${d.actual} ≠ ${d.expected}`;
        case 'type':                return `${d.path}: type ${d.actual} (${trunc(d.actualVal)}) ≠ ${d.expected} (${trunc(d.expectedVal)})`;
        case 'shape':               return `${d.path}: ${d.actual} ≠ ${d.expected}`;
        case 'null-mismatch':       return `${d.path}: ${trunc(d.actual)}  ≠  ${trunc(d.expected)}`;
        case 'missing-in-actual':   return `${d.path}: missing in server-v2 (expected ${trunc(d.expected)})`;
        case 'unexpected-in-actual':return `${d.path}: extra in server-v2 (got ${trunc(d.actual)})`;
        default:                    return `${d.path}: ${JSON.stringify(d)}`;
    }
}

let pass = 0, fail = 0, capture = 0;

const cases = FILTER ? CASES.filter(c => c.name.includes(FILTER)) : CASES;
const baselineCount = Object.keys(baselines).length;
console.log(`=== diff-real: ${ENDPOINT} ===`);
console.log(`(${cases.length} of ${CASES.length} case(s); ${baselineCount} baseline(s) loaded from ${fs.existsSync(BASELINES_PATH) ? 'baselines.json' : '<missing>'})\n`);

for (const c of cases) {
    console.log(`[${c.name}]`);
    const { json, ms } = await gqlPost(c.query);

    if (json.errors) {
        console.log(`  ✗ FAIL — server-v2 returned errors (${ms}ms):`);
        json.errors.slice(0, 3).forEach(e => console.log(`    ${e.message}`));
        if (json.errors.length > 3) console.log(`    ... and ${json.errors.length - 3} more`);
        fail++;
        console.log();
        continue;
    }

    const expected = baselines[c.name];
    if (expected === undefined) {
        console.log(`  · CAPTURE (no baseline) — ${ms}ms — server-v2 data:`);
        const lines = JSON.stringify(json.data, null, 2).split('\n');
        lines.slice(0, 40).forEach(l => console.log(`    ${l}`));
        if (lines.length > 40) console.log(`    ... (${lines.length - 40} more lines truncated)`);
        capture++;
        console.log();
        continue;
    }

    const diffs = filterIgnore(deepDiff(json.data, expected), c.ignore);
    if (diffs.length === 0) {
        console.log(`  ✓ PASS (${ms}ms)`);
        pass++;
    } else {
        console.log(`  ✗ FAIL — ${diffs.length} diff(s) (${ms}ms):`);
        diffs.slice(0, 25).forEach(d => console.log(`    ${summarizeDiff(d)}`));
        if (diffs.length > 25) console.log(`    ... and ${diffs.length - 25} more`);
        fail++;
    }
    console.log();
}

console.log(`=== ${pass} pass · ${fail} fail · ${capture} capture-only ===`);
process.exit(fail > 0 ? 1 : 0);
