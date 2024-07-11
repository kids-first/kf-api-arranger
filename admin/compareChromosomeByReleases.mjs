//node admin/compareChromosomeByReleases.mjs --limits=12,17 --releases=re_20240709_1,re_20240620_1
//node admin/compareChromosomeByReleases.mjs --limits=,y --releases=re_20240709_1,re_20240620_1
//node admin/compareChromosomeByReleases.mjs --limits=12,17 --releases=re_20240709_1
import assert from 'node:assert/strict';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const chromosomes = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    'x',
    'y',
];

const args = process.argv.slice(2);
const limitsArgument = args.find(x => x.startsWith('--limits='));
const limits = (() => {
    if (!limitsArgument) {
        return chromosomes;
    }
    const rawLimits = limitsArgument.split('--limits=')[1].trim();
    const nToAutosomes = {
        x: 23,
        '23': 'x',
        y: 24,
        '24': 'y',
    };
    let [sStart, sStop] = rawLimits.split(',');
    if (!sStart && !sStop) {
        return chromosomes;
    }
    if (rawLimits.startsWith(',')) {
        sStart = 1;
        sStop = parseInt(
            rawLimits
                .replace('x', nToAutosomes.x)
                .replace('y', nToAutosomes.y)
                .split(',')[1]
                .trim(),
            10,
        );
    } else if (rawLimits.endsWith(',')) {
        sStart = parseInt(
            rawLimits
                .replace('x', nToAutosomes.x)
                .replace('y', nToAutosomes.y)
                .split(',')[0]
                .trim(),
            10,
        );
        sStop = 24;
    }

    const start = parseInt(['x', 'y'].includes(sStart) ? nToAutosomes[sStart] : sStart, 10);
    const stop = parseInt(['x', 'y'].includes(sStop) ? nToAutosomes[sStop] : sStop, 10);
    assert(start <= stop && stop <= nToAutosomes.y);
    return Array(stop - start + 1)
        .fill(start)
        .map((n, i) => (n + i).toString())
        .map(n => nToAutosomes[n] ?? n);
})();
assert(limits.length >= 1);

const releasesArgument = args.find(x => x.startsWith('--releases=')) ?? '';
const [r1, r2] = releasesArgument.split('--releases=')[1].split(',');
assert(
    [r1, r2].some(r => r && r.includes('re_')),
    'At least one release argument is expected. It must start by "re_". ',
);

const client = new Client({ node: esHost });

const catIndicesResponse = await client.cat.indices({
    index: `variant_centric_*_re*`,
    h: 'index',
    format: 'json',
});

if (catIndicesResponse.statusCode !== 200) {
    console.error('Received bad response', catIndicesResponse, ' Terminating.');
    process.exit(1);
}

const allIndices = catIndicesResponse.body.map(x => x.index);

const extractChromosomeDesignation = indexName => {
    const right = indexName.split('variant_centric_')[1];
    return right.split('_re')[0];
};

const getAllChromosomesCountsByRelease = async r => {
    const matchingIndices = allIndices.filter(x => {
        const hasRel = x.endsWith(r);
        const chr = extractChromosomeDesignation(x);
        return hasRel && limits.includes(chr);
    });
    if (matchingIndices.length === 0) {
        return [];
    }
    const mSearchesGlobalResponse = await client.msearch({
        body: matchingIndices
            .map(x => [{ index: x }, { query: { match_all: {} }, size: 0, track_total_hits: true }])
            .flat(),
    });
    const counts = mSearchesGlobalResponse.body.responses.map(x => Intl.NumberFormat().format(x.hits?.total?.value));
    const formattedMatchingIndices = matchingIndices.map((x, i) => ({
        chr: extractChromosomeDesignation(x),
        [r]: counts[i],
    }));

    return limits.map(x => {
        const chr = formattedMatchingIndices.find(e => e.chr === x);
        if (chr) {
            return chr;
        }
        return {
            chr: x,
            [r]: 0,
        };
    });
};

console.log('...searching')
console.time('mSearch')
const chrToCountsR1 = await getAllChromosomesCountsByRelease(r1);
if (chrToCountsR1.length === 0) {
    console.debug('Nothing found for release: ', r1);
}
const chrToCountsR2 = await getAllChromosomesCountsByRelease(r2);
if (chrToCountsR2.length === 0) {
    console.debug('Nothing found for release: ', r2);
}
console.timeEnd('mSearch')
const results = chrToCountsR1.map(x => {
    const y = chrToCountsR2.find(e => e.chr === x.chr) || {};
    return { ...x, ...y };
});

console.table(results);