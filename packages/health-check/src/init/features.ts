interface Features {
  healthCheck: boolean;
  generateReadme: boolean;
  suggestRepos: boolean;
  contributorActivity: boolean;
  workflowReport: boolean;
}

const features: Features = {
  healthCheck: process.env.RUN_HEALTH_CHECK == '1',
  generateReadme: process.env.RUN_GENERATE_README == '1',
  suggestRepos: process.env.RUN_SUGGEST_REPOS == '1',
  contributorActivity: process.env.RUN_CONTRIBUTOR_ACTIVITY == '1',
  workflowReport: process.env.RUN_WORKFLOW_REPORT == '1',
};

export default features;
export type { Features };
