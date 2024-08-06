import fs from 'node:fs';
import assert from 'node:assert/strict';

const sortConf = conf => {
    const indices = conf.indices;
    const sIndices = conf.indices
        .map(x => x.graphqlField)
        .sort()
        .map(x => ({ ...indices.find(y => y.graphqlField === x) }));

    const mutations = conf.extendedMappingMutations;
    const sGraphqlFields = [...new Set(mutations.map(x => x.graphqlField))].sort();
    const sMutations = sGraphqlFields.reduce((xs, x) => {
        const elWithSameGqlField = mutations
            .filter(m => m.graphqlField === x)
            .map(x => x.field)
            .sort()
            .map(x => ({ ...mutations.find(m => m.field === x) }));
        return [...xs, ...elWithSameGqlField];
    }, []);

    return {
        indices: sIndices,
        extendedMappingMutations: sMutations,
    };
};

const processConf = path =>
    fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        console.info(`Reading Conf...`);
        const conf = { ...JSON.parse(data) };
        assert(Object.keys(conf).every(k => ['indices', 'extendedMappingMutations'].includes(k)));
        const sConf = { ...sortConf(conf) };
        assert(
            conf.indices.length === sConf.indices.length &&
                conf.extendedMappingMutations.length === sConf.extendedMappingMutations.length,
        );
        fs.writeFile(path, JSON.stringify(sConf, null, 2), err => {
            if (err) {
                console.error(err);
            }
            console.info(`Writing Sorted Conf...`);
        });
    });

processConf('admin/arrangerProjectConf.json');
