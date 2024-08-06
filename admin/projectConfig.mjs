import arrangerProjectConf from './arrangerProjectConf.json' assert { type: "json" };

export const projectConfig = (projectName) => {
    const lambda = x => ({ ...x, projectId: projectName });
    return  {
        name: projectName,
        indices: [...arrangerProjectConf.indices].map(lambda),
        extendedMappingMutations: [...arrangerProjectConf.extendedMappingMutations].map(lambda),
    }
};
