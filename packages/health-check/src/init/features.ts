interface Features {
  healthCheck: boolean;
  generateReadme: boolean;
  suggestRepos: boolean;
  contributorActivity: boolean;
  workflowReport: boolean;
  infrastructureReport: boolean;
  repoIndex: boolean;
  contributorIndex: boolean;
  queryRepos: boolean;
  queryContributors: boolean;
}

const features: Features = {
  healthCheck: process.env.RUN_HEALTH_CHECK == '1',
  generateReadme: process.env.RUN_GENERATE_README == '1',
  suggestRepos: process.env.RUN_SUGGEST_REPOS == '1',
  contributorActivity: process.env.RUN_CONTRIBUTOR_ACTIVITY == '1',
  workflowReport: process.env.RUN_WORKFLOW_REPORT == '1',
  infrastructureReport: process.env.RUN_INFRASTRUCTURE_REPORT == '1',
  repoIndex: process.env.RUN_REPO_INDEX == '1',
  contributorIndex: process.env.RUN_CONTRIBUTOR_INDEX == '1',
  queryRepos: process.env.RUN_QUERY_REPOS == '1',
  queryContributors: process.env.RUN_QUERY_CONTRIBUTORS == '1',
};

console.log(`\n\n🔍 ---------------------------------------\nFeatures\n`);

export default features;
export type { Features };
