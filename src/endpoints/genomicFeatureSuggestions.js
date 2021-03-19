import EsInstance from '../ElasticSearchClientInstance';
import { indexNameGenomicFeatureSuggestion, maxNOfGenomicFeatureSuggestions } from '../env';
import { StatusCodes } from 'http-status-codes';

const NEEDED_SOURCE_FIELDS = ['type', 'suggestion_id', 'locus', 'symbol'];

export default async (req, res) => {
  const prefix = req.params.prefix;

  const client = await EsInstance.getInstance();

  const { body } = await client.search({
    index: indexNameGenomicFeatureSuggestion,
    body: {
      _source: NEEDED_SOURCE_FIELDS,
      suggest: {
        suggestions: {
          prefix,
          completion: {
            field: 'suggest',
            size: maxNOfGenomicFeatureSuggestions,
          },
        },
      },
    },
  });

  const suggestionResponse = body.suggest.suggestions[0];

  const searchText = suggestionResponse.text;
  const suggestions = suggestionResponse.options.map((suggestion) => ({
    matchedText: suggestion.text,
    suggestion_id: suggestion._source.suggestion_id,
    locus: suggestion._source.locus,
    type: suggestion._source.type,
    geneSymbol: suggestion._source.symbol,
  }));

  res.status(StatusCodes.OK).send({
    searchText,
    suggestions,
  });
};
