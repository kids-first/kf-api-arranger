import includeConf from './confInclude.json' assert { type: "json" };
import kfConf from './confKfNext.json' assert { type: "json" };

export const projectsConfig = (projectName, env) => {
    const envToConf = {
        kf: kfConf,
        include: includeConf,
    };
    const lambda = x => ({ ...x, projectId: projectName });
    return [
        {
            name: projectName,
            indices: [...envToConf[env].indices].map(lambda),
            extendedMappingMutations: [...envToConf[env].extendedMappingMutations].map(lambda),
        }
    ]
};
