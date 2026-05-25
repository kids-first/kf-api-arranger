// Slice U: programmatic port of the ColumnState family from
// arranger-2.19.2/modules/schema/src/State.js (output types only).
// AggState/AggsState/MatchBoxState families and all *Input types are omitted
// — include-portal-ui's frontend audit (2026-05-22) confirmed only
// columnsState + extended are queried.

import { GraphQLBoolean, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';

const ColumnSortType = new GraphQLObjectType({
    name: 'ColumnSort',
    fields: () => ({
        id: { type: GraphQLString },
        desc: { type: GraphQLBoolean },
    }),
});

const ColumnType = new GraphQLObjectType({
    name: 'Column',
    fields: () => ({
        show: { type: GraphQLBoolean },
        type: { type: GraphQLString },
        sortable: { type: GraphQLBoolean },
        canChangeShow: { type: GraphQLBoolean },
        query: { type: GraphQLString },
        jsonPath: { type: GraphQLString },
        id: { type: GraphQLString },
        field: { type: GraphQLString },
        accessor: { type: GraphQLString },
    }),
});

const ColumnStateType = new GraphQLObjectType({
    name: 'ColumnState',
    fields: () => ({
        type: { type: GraphQLString },
        keyField: { type: GraphQLString },
        defaultSorted: { type: new GraphQLList(ColumnSortType) },
        columns: { type: new GraphQLList(ColumnType) },
    }),
});

export const ColumnsStateType = new GraphQLObjectType({
    name: 'ColumnsState',
    fields: () => ({
        state: { type: ColumnStateType },
        timestamp: { type: GraphQLString },
    }),
});
