import { resolveSetsInSqon } from '../sqon/resolveSetInSqon';

const resolveSets = async (resolve, parent, args, context, info): Promise<unknown> => {
    const accessToken = `Bearer ${context.auth.token || ''}`;
    const userId = context.auth.content.sub;
    const sqon = args.filters;

    const sqonWithSetContent = await resolveSetsInSqon(sqon, userId, accessToken);

    const argsWithSqonUpdated = { ...args, filters: sqonWithSetContent };

    return resolve(parent, argsWithSqonUpdated, context, info);
};

export const resolveSetInQueries = {
    participant: {
        hits: resolveSets,
        aggregations: resolveSets,
    },
    variantStats: {
        hits: resolveSets,
        aggregations: resolveSets,
    },
    file: {
        hits: resolveSets,
        aggregations: resolveSets,
    },
    studies: {
        hits: resolveSets,
        aggregations: resolveSets,
    },
};
