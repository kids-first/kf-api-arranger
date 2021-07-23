import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import toLower from 'lodash/toLower';
import get from 'lodash/get';

const setMutationNames = ['saveSet', 'deleteSets', 'updateSet'];

export const onlyAdminMutations = {
    Mutation: (resolve, parent, args, context, info) => {
        const { name: mutationName } = parseResolveInfo(info) as ResolveTree;
        const roles = get(context, 'kauth.grant.access_token.content.realm_access.roles', []);

        const hasAdminRole = roles.map(toLower).includes('admin');

        const adminRoleNeededForMutation = !hasAdminRole && !setMutationNames.includes(mutationName);
        if (adminRoleNeededForMutation) {
            throw new Error('Unauthorized - Administrator role is required');
        }
        return resolve(parent, args, context, info);
    },
};
