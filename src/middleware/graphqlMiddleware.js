const setMutationNames = ['saveSet', 'deleteSets', 'updateSet'];

const ActionTypes = {
  CREATE: 'CREATE',
  DELETE: 'DELETE',
  UPDATE: 'UPDATE',
};

export const onlyAdminMutations = {
  Mutation: (resolve, parent, args, context, info) => {
    const mutationName = info.fieldName;
    const roles = ['toto']; // get(context, 'jwt.context.user.roles', []); //FIXME ------------

    const hasAdminRole = roles.map((s) => s.toLowerCase()).includes('admin');

    const adminRoleNeededForMutation = !hasAdminRole && !setMutationNames.includes(mutationName);
    if (adminRoleNeededForMutation) {
      throw new Error('Unauthorized - Administrator role is required');
    }
    return resolve(parent, args, context, info);
  },
};

export const setMutations = {
  Mutation: (resolve, parent, args, context, info) => {
    const mutationName = info.fieldName;
    if (!setMutationNames.includes(mutationName)) {
      return resolve(parent, args, context, info);
    }

    const userIdFromToken = context.jwt?.sub || 'add74102-24f9-4a6c-8cc1-ede1394d70bf';
    const enhancedArgs = { ...args, userId: userIdFromToken };

    const response = resolve(parent, enhancedArgs, context, info);
    response.then((res) => toSqs(mutationName, res, enhancedArgs));

    return response;
  },
};

const toSqs = (type, body, args) => {
  const { userId, setIds } = args;
  switch (type) {
    case 'saveSet':
      console.log(body, 'BODY');
      const { tag } = body;
      if (tag) {
        // postProcessCb({ actionType: ActionTypes.CREATE, values: body });
      }
      break;
    case 'deleteSets':
      console.log('deleteSets');
      if (body && setIds && userId) {
        // postProcessCb({
        //   actionType: ActionTypes.DELETE,
        //   values: {
        //     userId: userId,
        //     setIds: setIds,
        //   },
        // });
      }
      break;
    case 'updateSet':
      const { setUpdateAction } = args;
      console.log(body, 'B');
      console.log(userId, 'userId');
      if (body && userId && setUpdateAction) {
        if(setUpdateAction === 'ADD_IDS' || setUpdateAction === 'REMOVE_IDS'){
          console.log(setUpdateAction, 'setUpdateAction');
          // postProcessCb({
          //   actionType: ActionTypes.UPDATE,
          //   subActionType: setUpdateAction,
          //   values: {
          //     body: body.updatedSet,
          //   },
          // });
        }
        if(setUpdateAction === 'RENAME_TAG'){
          console.log(setUpdateAction, 'setUpdateAction');
          // postProcessCb({
          //   actionType: ActionTypes.UPDATE,
          //   subActionType: setUpdateAction,
          //   values: {
          //     userId: userId,
          //     setId: setId,
          //     newTag,
          //   },
          // });
        }

      }

      break;

    default:
  }
};
