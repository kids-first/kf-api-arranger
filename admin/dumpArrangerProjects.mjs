//docker run -it --rm --network host -v ${PWD}:/code --workdir /code node:24-alpine3.22 sh

import fs from 'node:fs';
import { Client } from '@elastic/elasticsearch';
import { esHost } from '../dist/src/env.js';

const OUT = 'experiments/data/arranger-projects/include.json';

const client = new Client({ node: esHost });

const r = await client.search({
    index: 'arranger-projects-include',
    size: 10000,
});

fs.writeFileSync(OUT, JSON.stringify(r.body, null, 2));
console.log(`wrote ${OUT} (${r.body.hits?.hits?.length ?? '?'} hits)`);
