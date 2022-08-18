const GRAPHQL_FIELD_STUDY = 'Study';
const GRAPHQL_FIELD_PARTICIPANT = 'Participant';

// Reminder: by arranger standards, project id must be lowered case.
const PROJECTS_IDS = {
    migration_test_qa: 'migration_test_qa',
};

const commonMutations = [
    {
        field: "experimental_strategy",
        graphqlField: GRAPHQL_FIELD_STUDY,
        extendedFieldMappingInput: {
            isArray: true,
        },
    },
    {
        field: "controlled_access",
        graphqlField: GRAPHQL_FIELD_STUDY,
        extendedFieldMappingInput: {
            isArray: true,
        },
    },
    {
        field: "data_category",
        graphqlField: GRAPHQL_FIELD_STUDY,
        extendedFieldMappingInput: {
            isArray: true,
        },
    }
];

const personalizeProject = (id, indices) => {
    const lambda = x => ({ ...x, projectId: id });
    return {
        name: id,
        indices: [...indices].map(lambda),
        extendedMappingMutations: [...commonMutations].map(lambda),
    };
};

export const projectsConfig = () => [
    {
        ...personalizeProject(PROJECTS_IDS.migration_test_qa, [
            {
                graphqlField: GRAPHQL_FIELD_STUDY,
                esIndex: 'migration_test_study_centric',
            },
            {
                graphqlField: GRAPHQL_FIELD_PARTICIPANT,
                esIndex: 'migration_test_participant_centric',
            },
        ]),
    },
];
