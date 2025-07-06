import GitHubApiClient from './github2/api-client.js';
import RepositoryService from './github2/repository-service.js';
import { normalizeGitHubRepositoryToDatabaseRepository } from './utils/normalize.js';
import type { SimpleRepository } from './utils/regex.js';
import GithubWorkflowService from './github2/workflow-service.js';
// import type { WorkflowWithStatus as GithubWorkflowWithStatus } from './github2/workflow-service.js';
type GithubWorkflowWithStatus = any; // TODO: Replace 'any' with the correct type if/when available
import { mapOctokitWorkflowToEntity } from './github2/mappers.js';
import DataConfig from './initialize-with-data.js';
import pLimit from 'p-limit';
import logger from './logger.js';
import { GitHubWorkflowEntity } from '@dfb/db';
import type { OctokitSearchIssue } from './github2/models.js';
import { findUniquePrRepos } from './utils/urls.js';
import { ContributorService } from './github2/contributor-service.js';
import { GitHubRepoModified } from './github2/repository-service.js';
/**
 * Process PRs, filter to unique active repos, insert repo data, and return unique active SimpleRepositories.
 */
export async function getGitHubRepositoryDataActiveRepos(
  configData: DataConfig,
  uniqueActiveRepos: SimpleRepository[]
): Promise<GitHubRepoModified[]> {
  const apiClient = new GitHubApiClient();
  const repoService = new RepositoryService(apiClient);

  // Limit concurrency to avoid API rate limits and DB overload
  const limit = pLimit(5);

  // Repo data
  const activeRepos = (
    await Promise.all(
      uniqueActiveRepos.map(repo =>
        limit(async () => {
          try {
            return await repoService.getRepositoryGraphql(repo.org, repo.repo);
          } catch (err) {
            logger.error(
              `Failed to fetch/insert repo for ${repo.org}/${repo.repo}: ${err instanceof Error ? err.message : String(err)}`
            );
            return undefined; // Explicitly return undefined on error
          }
        })
      )
    )
  ).filter((repo): repo is NonNullable<typeof repo> => repo !== undefined);

  return activeRepos;
}
export async function processWorkflow(
  configData: DataConfig,
  repo: SimpleRepository,
  apiClient?: GitHubApiClient
): Promise<GithubWorkflowWithStatus[]> {
  try {
    const client = apiClient ?? new GitHubApiClient();
    await client.getAndTestGitHubToken();

    const workflowService = new GithubWorkflowService(client);

    const workflows = await workflowService.getWorkflowsWithStatus(
      repo.org,
      repo.repo
    );

    if (!workflows || workflows.length === 0) {
      logger.warn(`Workflows NOT found for ${repo.org}/${repo.repo}`);
      return [];
    }

    await updateRepoForWorkflowSummary(configData, repo, workflows);

    // Prepare entities for batch insert
    const workflowEntities: GitHubWorkflowEntity[] = [];
    for (const workflow of workflows) {
      logger.info(
        `Workflow ${repo.org}/${repo.repo} - name:${workflow.name} id:${workflow.id} state:${workflow.state}`
      );
      if (workflow.id) {
        const entity = mapOctokitWorkflowToEntity(
          workflow,
          `${repo.org}/${repo.repo}`,
          {
            id: workflow.lastRunId ?? undefined,
            status: workflow.lastRunStatus ?? undefined,
            created_at: workflow.lastRunDate ?? undefined,
            url: workflow.lastRunUrl ?? undefined,
          }
        );
        if (entity.id !== undefined) {
          workflowEntities.push(entity as GitHubWorkflowEntity);
        }
      }
    }
    // Batch insert if any
    if (workflowEntities.length > 0) {
      await configData.db.databaseServices.workflowService.insertBatch(
        workflowEntities
      );
    }
    return workflows;
  } catch (error) {
    logger.error(
      `Error fetching workflows for ${repo.org}/${repo.repo}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}
async function updateRepoForWorkflowSummary(
  configData: DataConfig,
  repo: SimpleRepository,
  workflows: GithubWorkflowWithStatus[]
): Promise<void> {
  // Summarize workflow states
  const stateCounts: Record<string, number> = {};
  for (const workflow of workflows) {
    const state = workflow.state || 'unknown';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  }
  const stateSummary = Object.entries(stateCounts)
    .map(([state, count]) => `${count} ${state}`)
    .join(', ');
  // Example: "Workflows: 5 (3 active, 2 disabled)"
  const workflowStatus =
    `Workflows: ${workflows.length}` +
    (stateSummary ? ` (${stateSummary})` : '');

  await configData.db.databaseServices.repositoryService.updateRepositoryWorkflowStatus(
    `${repo.org}/${repo.repo}`,
    workflowStatus
  );
}
export async function getUniqueActiveSimpleRepositories(
  totalPrs: OctokitSearchIssue[]
): Promise<SimpleRepository[]> {
  const simpleRepositories: SimpleRepository[] = findUniquePrRepos(totalPrs);
  if (!simpleRepositories || simpleRepositories.length === 0) {
    return [];
  }
  const apiClient = new GitHubApiClient();
  const contributorService = new ContributorService(apiClient);
  const activeRepos = (
    await Promise.all(
      simpleRepositories.map(async repo => {
        const isActive = await contributorService.isActiveRepository(
          repo.org,
          repo.repo
        );
        return isActive ? repo : null;
      })
    )
  ).filter(Boolean) as SimpleRepository[];
  return activeRepos;
}
export async function processActiveRepos(
  configData: DataConfig,
  uniqueActiveRepos: SimpleRepository[]
): Promise<void> {
  const apiClient = new GitHubApiClient();
  const repoService = new RepositoryService(apiClient);

  // Limit concurrency to avoid API rate limits and DB overload
  const limit = pLimit(5);

  // Repo data
  await Promise.all(
    uniqueActiveRepos.map(repo =>
      limit(async () => {
        try {
          const repoData = await repoService.getRepositoryGraphql(
            repo.org,
            repo.repo
          );
          if (repoData) {
            await configData.db.databaseServices.repositoryService.insertBatch([
              normalizeGitHubRepositoryToDatabaseRepository(repoData),
            ]);
          }
          logger.info(`Repository ${repo.org}/${repo.repo}`);
        } catch (err) {
          logger.error(
            `Failed to fetch/insert repo for ${repo.org}/${repo.repo}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      })
    )
  );
  logger.info(
    `\n\n📊 Repositories data for ${uniqueActiveRepos.length} saved to database\n`
  );

  const workFlows: GithubWorkflowWithStatus[] = [];

  // Workflow data
  await Promise.all(
    uniqueActiveRepos.map(repo =>
      limit(async () => {
        try {
          const repoWorkflows = await processWorkflow(
            configData,
            repo,
            apiClient
          );
          workFlows.push(...repoWorkflows);
        } catch (err) {
          console.error(
            `Failed to fetch/insert repo for ${repo.org}/${repo.repo}:`,
            err
          );
        }
      })
    )
  );
  logger.info(
    `\n\n📊 Workflows data for ${workFlows.length} workflows saved to database\n`
  );
}
/*


  // moved to issuesAndPrs.ts
  
  // Extend GraphQLRepo interface for all nested fields
  interface GraphQLRepo {
    id: string | number;
    name: string;
    nameWithOwner: string;
    url: string;
    description?: string;
    stargazerCount?: number;
    forkCount?: number;
    isPrivate?: boolean;
    isFork?: boolean;
    isArchived?: boolean;
    isDisabled?: boolean;
    primaryLanguage?: { name: string } | string | null;
    licenseInfo?: { name: string } | string | null;
    owner: { login: string } | string;
    diskUsage?: number;
    createdAt?: string;
    updatedAt?: string;
    pushedAt?: string;
    watchers?: { totalCount: number };
    issues?: { totalCount: number };
    pullRequests?: { totalCount: number };
    repositoryTopics?: { nodes: { topic?: { name?: string } }[] };
    topics?: string[] | string;
    readme?: { text?: string } | string | null;
  }
  
  interface RestRepo {
    id: string | number;
    node_id?: string;
    name: string;
    full_name: string;
    html_url: string;
    description?: string;
    stargazers_count?: number;
    forks_count?: number;
    private?: boolean;
    fork?: boolean;
    archived?: boolean;
    disabled?: boolean;
    language?: string | null;
    license?: { name: string } | null;
    owner: { login: string } | string;
    disk_usage?: number;
    created_at?: string;
    updated_at?: string;
    pushed_at?: string;
    watchers_count?: number;
    open_issues_count?: number;
    topics?: string[] | string;
  }
  
  function isGraphQLRepo(obj: unknown): obj is GraphQLRepo {
    return typeof obj === 'object' && obj !== null && 'nameWithOwner' in obj;
  }
  
  function isRestRepo(obj: unknown): obj is RestRepo {
    return typeof obj === 'object' && obj !== null && 'full_name' in obj;
  }


// Normalized repo object type
export type NormalizedRepo = {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string;
  stargazerCount: number;
  forkCount: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  primaryLanguage?: string;
  licenseInfo?: string;
  owner: string;
  diskUsage?: number;
  createdAt?: string;
  updatedAt?: string;
  pushedAt?: string;
  watchersCount?: number;
  issuesCount?: number;
  pullRequestsCount?: number;
  topics?: string;
  readme?: string | null;
};

// Helper types for topic nodes



// Place these helpers above insertContributorRepos so they are in scope and use the correct method names/signatures

export async function fetchAndLogDependabotAlert(
  contributorLogin: string,
  org: string,
  repo: string,
  repoNameWithOwner: string
): Promise<void> {
  try {
    const apiClient = new GitHubApiClient();
    logger.info(
      `[insertContributorRepos] Fetching dependabot alerts for ${contributorLogin}/${org}/${repo}`
    );
    const dependabotService = new DependabotAlertService(apiClient);
    // Get Alerts
    const result: DependabotAlertResult =
      await dependabotService.getAlertsForRepo(org, repo);
    // Update repository dependabot status
    await DbService.updateRepositoryDependabotStatus(
      org,
      repo,
      result.status == 'ok'
        ? `${result.status}: ${result.alerts.length} alerts found`
        : `${result.status}`
    );
    if (result.status !== 'ok') {
      logger.warn(
        `[insertContributorRepos] Failed to fetch dependabot alerts for ${org}/${repo}: ${result.message || 'Unknown error'}`
      );
      return;
    }
    if (result.alerts.length === 0) {
      logger.info(
        `[insertContributorRepos] No dependabot alerts found for ${org}/${repo}`
      );
    } else {
      logger.info(
        `[insertContributorRepos] Found ${result.alerts.length} dependabot alerts for ${org}/${repo}`
      );
    }
    await DbService.init();
    const dependabotEntities = [];
    for (const alert of result.alerts) {
      logger.info(
        `[insertContributorRepos] Dependabot Alert: ${alert.number} - ${alert.state}`
      );
      const entity = mapOctokitDependabotAlertToEntity(alert, `${org}/${repo}`);
      if (entity.id !== undefined) {
        dependabotEntities.push(entity as DbDependabotAlert);
      }
    }
    if (dependabotEntities.length > 0) {
      await DbService.DependabotAlert.upsertBatch(dependabotEntities);
    }
  } catch (error) {
    logger.error(
      `Error fetching dependabot alerts for ${contributorLogin}/${repoNameWithOwner}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


*/
