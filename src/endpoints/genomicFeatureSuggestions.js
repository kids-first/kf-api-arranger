import EsInstance from '../ElasticSearchClientInstance';
import {
  indexNameGeneFeatureSuggestion,
  indexNameVariantFeatureSuggestion,
  maxNOfGenomicFeatureSuggestions,
} from '../env';
import { StatusCodes } from 'http-status-codes';
import { SUGGESTIONS_TYPES } from '../app';

export default async (req, res, type) => {
  const prefix = req.params.prefix;

  const client = await EsInstance.getInstance();

  const _index =
    type === SUGGESTIONS_TYPES.GENE
      ? indexNameGeneFeatureSuggestion
      : indexNameVariantFeatureSuggestion;

  const { body } = await client.search({
    index: _index,
    body: {
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

  const suggestions = suggestionResponse.options.map(suggestion => suggestion._source);

  res.status(StatusCodes.OK).send({
    searchText,
    suggestions,
  });
};
