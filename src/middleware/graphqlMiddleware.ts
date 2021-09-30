export const resolveSetInQueries = {
    Root: (resolve, parent, args, context, info) => {
        console.log('this is a query !');
        return resolve(parent, args, context, info);
    },
};
