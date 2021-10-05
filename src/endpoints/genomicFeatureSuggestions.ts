import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import EsInstance from '../ElasticSearchClientInstance';
import {
    esHost,
    indexNameGeneFeatureSuggestion,
    indexNameVariantFeatureSuggestion,
    maxNOfGenomicFeatureSuggestions,
} from '../env';

export const SUGGESTIONS_TYPES = {
    VARIANT: 'variant',
    GENE: 'gene',
};

export default async (req: Request, res: Response, type: string): Promise<void> => {
    const prefix = req.params.prefix;

    const client = await EsInstance.getInstance();

    const _index = type === SUGGESTIONS_TYPES.GENE ? indexNameGeneFeatureSuggestion : indexNameVariantFeatureSuggestion;

    console.log(_index);
    console.log(esHost);

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
