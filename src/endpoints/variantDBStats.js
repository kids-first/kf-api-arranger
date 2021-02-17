import { esHost, variantStatsIndex } from '../env';
import { Client } from '@elastic/elasticsearch';

const es = new Client({ node: esHost });

export default () => async (req, res) => {
  try {
    const response = await es.search({
      index: variantStatsIndex,
      body: {
        query: {
          match_all: {},
        },
      },
    });

    res.json(response.body.hits.hits[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot fetch stats', esHost: esHost, index: variantStatsIndex });
  }
};
