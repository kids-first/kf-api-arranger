/*
 * Functions I use manually to work with the indices. This file only serves as doc for now.
 * */

//GET _cat/indices/*re_20230915_1?format=json&h=index
const makeDeleteIndicesQuery = indices =>
    `DELETE ${indices
        .map(x => x.index)
        .sort()
        .join(',')}`;
