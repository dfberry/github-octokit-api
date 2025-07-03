import GitHubApiClient from './github2/api-client.js';
import RepositoryService, {
  GitHubRepoModified,
} from './github2/repository-service.js';
import { DbService } from './typeorm/db-service.js';
import { normalizeGitHubRepositoryToDatabaseRepository } from './utils/normalize.js';
import type { SimpleRepository } from './utils/regex.js';
import GithubWorkflowService from './github2/workflow-service.js';
import type { WorkflowWithStatus as GithubWorkflowWithStatus } from './github2/workflow-service.js';
import { mapOctokitWorkflowToEntity } from './github2/mappers.js';
import type { Workflow as DbWorkflow } from './typeorm/Workflow.js';

/**
 * Process PRs, filter to unique active repos, insert repo data, and return unique active SimpleRepositories.
 */
export async function processActiveRepos(
  uniqueActiveRepos: SimpleRepository[]
): Promise<void> {
  const apiClient = new GitHubApiClient();
  const repoService = new RepositoryService(apiClient);

  // Repo data
  await Promise.all(
    uniqueActiveRepos.map(async (repo: SimpleRepository) => {
      try {
        const repoData: GitHubRepoModified | null =
          await repoService.getRepositoryGraphql(repo.org, repo.repo);
        if (repoData) {
          await DbService.insertRepository(
            normalizeGitHubRepositoryToDatabaseRepository(repoData)
          );
        }
        console.log(`Repository ${repo.org}/${repo.repo}`);
      } catch (err) {
        console.error(
          `Failed to fetch/insert repo for ${repo.org}/${repo.repo}:`,
          err
        );
      }
    })
  );
  console.log(
    `\n\n📊 Repositories data for ${uniqueActiveRepos.length} saved to database\n`
  );

  const workFlows: GithubWorkflowWithStatus[] = [];

  // Workflow data
  await Promise.all(
    uniqueActiveRepos.map(async repo => {
      try {
        const repoWorkflows = await processWorkflow(repo);
        workFlows.push(...repoWorkflows);
      } catch (err) {
        console.error(
          `Failed to fetch/insert repo for ${repo.org}/${repo.repo}:`,
          err
        );
      }
    })
  );
  console.log(
    `\n\n📊 Workflows data for ${workFlows.length} workflows saved to database\n`
  );
}
export async function processWorkflow(
  repo: SimpleRepository
): Promise<GithubWorkflowWithStatus[]> {
  try {
    const apiClient = new GitHubApiClient();
    await apiClient.getAndTestGitHubToken();

    const workflowService = new GithubWorkflowService(apiClient);

    const workflows: GithubWorkflowWithStatus[] =
      await workflowService.getWorkflowsWithStatus(repo.org, repo.repo);

    if (!workflows || workflows.length === 0) {
      console.log(`Workflows NOT found for ${repo.org}/${repo.repo}`);
      return [];
    }

    await DbService.init();
    await updateRepoForWorkflowSummary(repo, workflows);

    for await (const workflow of workflows) {
      console.log(
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
          await DbService.insertWorkflow(entity as DbWorkflow);
        }
      }
    }

    return workflows;
  } catch (error) {
    console.error(
      `Error fetching workflows for ${repo.org}/${repo.repo}: ${error instanceof Error ? error.message : String(error)}`
    );
    return [];
  }
}
async function updateRepoForWorkflowSummary(
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

  await DbService.updateRepositoryWorkflowStatus(
    repo.org,
    repo.repo,
    workflowStatus
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
    console.log(
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
      console.warn(
        `[insertContributorRepos] Failed to fetch dependabot alerts for ${org}/${repo}: ${result.message || 'Unknown error'}`
      );
      return;
    }
    if (result.alerts.length === 0) {
      console.log(
        `[insertContributorRepos] No dependabot alerts found for ${org}/${repo}`
      );
    } else {
      console.log(
        `[insertContributorRepos] Found ${result.alerts.length} dependabot alerts for ${org}/${repo}`
      );
    }
    await DbService.init();
    for await (const alert of result.alerts) {
      console.log(
        `[insertContributorRepos] Dependabot Alert: ${alert.number} - ${alert.state}`
      );
      const entity = mapOctokitDependabotAlertToEntity(alert, `${org}/${repo}`);
      if (entity.id !== undefined) {
        await DbService.insertDependabot(entity as DbDependabotAlert);
      }
    }
  } catch (error) {
    console.error(
      `Error fetching dependabot alerts for ${contributorLogin}/${repoNameWithOwner}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


*/
