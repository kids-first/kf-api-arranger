import { esHost } from '../env';
import { Client } from '@elastic/elasticsearch';

const es = new Client({ node: esHost });

const getVariantStats = async () => {
  const { body } = await es.search({
    index: 'variant_stats',
    body: {
      query: {
        match_all: {},
      },
    },
  });

  return body;
};

export default () => async (req, res) => {
  try {
    const response = await getVariantStats();

    res.json(response.hits.hits[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
};
