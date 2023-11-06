import includeConf from './confInclude.json' assert { type: "json" };
import kfConf from './conf.json' assert { type: "json" };

export const projectsConfig = env => {
    const envToConf = {
        kf: kfConf,
        include: includeConf,
    };
    return Object.entries(envToConf[env]).map(([key, value]) => {
        const lambda = x => ({ ...x, projectId: key });
        return {
            name: key,
            indices: [...value.indices].map(lambda),
            extendedMappingMutations: [...value.extendedMappingMutations].map(lambda),
        };
    });
};
