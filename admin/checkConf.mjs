import includeConf from './confInclude.json' assert { type: "json" };
import kfConf from './confKfNext.json' assert { type: "json" };

const kfs = kfConf.extendedMappingMutations.map(m => [m.field, m.graphqlField]);
const incs = includeConf.extendedMappingMutations.map(m => [m.field, m.graphqlField]);

console.info('mutation in Kf only');
console.table(
    kfs.filter(kf => !incs.some(ins => kf[0] === ins[0] && kf[1] === ins[1])).map(x => ({ field: x[0], entity: x[1] })),
);

console.info('mutation in Include only');
console.table(
    incs.filter(ins => !kfs.some(kf => kf[0] === ins[0] && kf[1] === ins[1])).map(x => ({ field: x[0], entity: x[1] })),
);
