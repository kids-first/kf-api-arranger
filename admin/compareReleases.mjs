//ex: node admin/compareReleases --a:relA --b:relB --verbose:true
import assert from 'node:assert/strict';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';
import { getAllCountsPerStudy, studyIdToStudyCode } from './releaseStatsUtils.mjs';

const args = process.argv.slice(2);
const aArgument = args.find(x => x.startsWith('--a:')) ?? '';
const a = aArgument.split('--a:')[1];
const bArgument = args.find(x => x.startsWith('--b:')) ?? '';
const b = bArgument.split('--b:')[1];
assert(!!a && !!b, 'Missing releases');

const verboseArgument = args.find(a => a.startsWith('verbose:')) ?? '';
const verbose = ['true', 'yes', 'y'].includes(verboseArgument.split('verbose:')[1]?.toLocaleLowerCase() || ``);

const client = new Client({ node: esHost });

const xs = [];
for (const x of [a, b]) {
    const rStudyDict = await studyIdToStudyCode(client, x);
    assert(!rStudyDict[0], rStudyDict[0]);
    const studyDict = rStudyDict[1];
    const rAllCounts = await getAllCountsPerStudy(client, x, studyDict);
    assert(!rAllCounts[0], rAllCounts[0]);
    xs.push(rAllCounts[1]);
}

assert(xs.length === 2);

const showOperator = (n, m) => {
    // both strings or both numbers is ok
    if (n === m) {
        return '=';
    }

    if ([n, m].some(x => !Number.isInteger(x))) {
        return '?';
    }

    if (n > m) {
        return '>';
    } else if (n < m) {
        return '<';
    }
    // should be dead code, but better safe than sorry
    return '?';
};

const [aCounts, bCounts] = xs;
const res = Object.entries(aCounts).reduce(
    (xs, x) => {
        const [messages, table] = xs;
        const [id, v] = x;

        const next = bCounts[id];
        if (!next) {
            return [[...messages, id], table];
        }
        return [
            messages,
            {
                ...table,
                [id]: {
                    code: v.code,
                    participant_centric: [
                        v.participant_centric,
                        next.participant_centric,
                        showOperator(v.participant_centric, next.participant_centric),
                    ],
                    file_centric: [v.file_centric, next.file_centric, showOperator(v.file_centric, next.file_centric)],
                    biospecimen_centric: [
                        v.biospecimen_centric,
                        next.biospecimen_centric,
                        showOperator(v.biospecimen_centric, next.biospecimen_centric),
                    ],
                    releases: `${v.release} vs ${next.release}`,
                },
            },
        ];
    },
    [[], {}],
);

const messages = res[0];
if (messages.length > 0) {
    console.warn(`${messages.length} studies skipped (exist only in 1 release, not both)`);
    if (verbose) {
        console.log(messages);
    }
}

console.table(res[1]);
