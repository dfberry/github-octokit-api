import { DataSource } from 'typeorm';
import { GitHubContributorEntity } from '../entity/Contributor.js';
import { GitHubRepositoryEntity } from '../entity/Repository.js';
import { GitHubWorkflowEntity } from '../entity/Workflow.js';
import { GitHubContributorIssuePrEntity } from '../entity/ContributorIssuePr.js';
import { GitHubDependabotAlertEntity } from '../entity/DependabotAlert.js';

export interface TableSummary {
  contributors: number;
  repositories: number;
  workflows: number;
  contributorIssuePrs: number;
  dependabotAlerts: number;
}
// Original data tables only
export async function summarizeDbTables(
  dataSource: DataSource
): Promise<TableSummary> {
  const [
    contributors,
    repositories,
    workflows,
    contributorIssuePrs,
    dependabotAlerts,
  ] = await Promise.all([
    dataSource.getRepository(GitHubContributorEntity).count(),
    dataSource.getRepository(GitHubRepositoryEntity).count(),
    dataSource.getRepository(GitHubWorkflowEntity).count(),
    dataSource.getRepository(GitHubContributorIssuePrEntity).count(),
    dataSource.getRepository(GitHubDependabotAlertEntity).count(),
  ]);

  return {
    contributors,
    repositories,
    workflows,
    contributorIssuePrs,
    dependabotAlerts,
  };
}
