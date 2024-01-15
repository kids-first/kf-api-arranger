<<<<<<< Updated upstream
import config from './conf.json';
=======
import includeConf from './confInclude.json' assert { type: "json" };
import kfConf from './confKfNext.json' assert { type: "json" };
>>>>>>> Stashed changes

export const projectsConfig = () =>
    Object.entries(config).map(([key, value]) => {
        const lambda = x => ({ ...x, projectId: key });
        return {
            name: key,
            indices: [...value.indices].map(lambda),
            extendedMappingMutations: [...value.extendedMappingMutations].map(lambda),
        };
    });
