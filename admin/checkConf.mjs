import includeConf from './confInclude.json' assert { type: "json" };
import kfConf from './confKfNext.json' assert { type: "json" };


const kfs = kfConf.extendedMappingMutations.map(m => [m.field, m.graphqlField]);
const incs = includeConf.extendedMappingMutations.map(m => [m.field, m.graphqlField]);

console.info(
    'mutation in Kf only',
    kfs.filter(kf => !incs.some(ins => kf[0] === ins[0] && kf[1] === ins[1])),
);
console.info('mutation in Include only',  incs.filter(ins => !kfs.some(kf => kf[0] === ins[0] && kf[1] === ins[1])));


