import toLower from 'lodash/toLower';
import get from 'lodash/get';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

const setMutationNames = ['saveSet', 'deleteSets', 'updateSet'];

export const onlyAdminMutations = {
  Mutation: (resolve, parent, args, context, info) => {
    const { name: mutationName } = parseResolveInfo(info);
    const roles = get(context, 'jwt.context.user.roles', []);

    const hasAdminRole = roles.map(toLower).includes('admin');

    const adminRoleNeededForMutation = !hasAdminRole && !setMutationNames.includes(mutationName);
    if (adminRoleNeededForMutation) {
      throw new Error('Unauthorized - Administrator role is required');
    }
    return resolve(parent, args, context, info);
  },
};
