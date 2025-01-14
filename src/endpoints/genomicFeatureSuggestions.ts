import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import EsInstance from '../ElasticSearchClientInstance';
import {
    indexNameGeneFeatureSuggestion,
    indexNameVariantFeatureSuggestion,
    indexNameVariantSomaticFeatureSuggestion,
    maxNOfGenomicFeatureSuggestions,
} from '../env';

export const SUGGESTIONS_TYPES = {
    VARIANT: 'variant',
    VARIANT_SOMATIC: 'variant_somatic',
    GENE: 'gene',
};

export default async (req: Request, res: Response, next: NextFunction, type: string): Promise<void> => {
    try {
        const prefix = req.params.prefix;

        const client = await EsInstance.getInstance();

        const retrieveIndex = () => {
            switch (type) {
                case SUGGESTIONS_TYPES.GENE:
                    return indexNameGeneFeatureSuggestion;
                case SUGGESTIONS_TYPES.VARIANT:
                    return indexNameVariantFeatureSuggestion;
                case SUGGESTIONS_TYPES.VARIANT_SOMATIC:
                    return indexNameVariantSomaticFeatureSuggestion;
            }
        };
        const _index = retrieveIndex();

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
    } catch (e) {
        next(e);
    }
};
