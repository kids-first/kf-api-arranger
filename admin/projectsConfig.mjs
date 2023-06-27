import config from './confInclude.json';

export const projectsConfig = () =>
    Object.entries(config).map(([key, value]) => {
        const lambda = x => ({ ...x, projectId: key });
        return {
            name: key,
            indices: [...value.indices].map(lambda),
            extendedMappingMutations: [...value.extendedMappingMutations].map(lambda),
        };
    });
