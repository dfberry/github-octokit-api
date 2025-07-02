import { ContributorService } from './github2/contributor-service.js';
import type DataConfig from './initialize-with-data.js';
import type { ContributorData, ContributorRepo } from './github2/models.js';
import { DbService } from './typeorm/db-service.js';
import { extractOrgAndRepoFromFullName } from './utils/regex.js';
import GitHubApiClient from './github2/api-client.js';
import WorkflowService from './github2/workflow-service.js';
import type { WorkflowWithStatus } from './github2/models.js';
import type { Workflow as DbWorkflow } from './typeorm/Workflow.js';
import {
  mapOctokitWorkflowToEntity,
  mapOctokitDependabotAlertToEntity,
} from './github2/mappers.js';
import DependabotAlertService, {
  DependabotAlertResult,
} from './github2/dependabot-alert-service.js';
import type { OctokitDependabotAlert } from './github2/models.js';
import type { DependabotAlert as DbDependabotAlert } from './typeorm/DependabotAlert.js';
import RepositoryService from './github2/repository-service.js';
/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */
// --- Fetch helpers ---
async function fetchContributors(
  configData: DataConfig
): Promise<ContributorData[]> {
  const apiClient = new GitHubApiClient();
  const contributorCollector = new ContributorService(apiClient);
  if (configData.microsoftContributors.length === 0) {
    console.log('No contributors found in configuration.');
    return [];
  }
  console.log(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  const contributorDataList: ContributorData[] = [];
  for await(const contributor of configData.microsoftContributors) { // tbd for await
    console.log(`Processing contributor: ${contributor}`);
    try {
      // Use the GraphQL method for full data
      const contributorData = await contributorCollector.getContributorGraphql(
        contributor,
        30
      );
      contributorDataList.push(contributorData as unknown as ContributorData);
      break; //TBD
    } catch (error) {
      console.log(
        `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue with next contributor
      break; //TBD
    }
  }
  return contributorDataList;
}

// --- Insert helpers ---
async function insertContributor(contributorData: ContributorData) {
  await DbService.insertContributor({
    id: contributorData.login,
    avatar_url: contributorData.avatarUrl || '',
    name: contributorData.name,
    company: contributorData.company,
    blog: contributorData.blog,
    location: contributorData.location,
    bio: contributorData.bio,
    twitter: contributorData.twitter,
    followers: contributorData.followers,
    following: contributorData.following,
    public_repos: contributorData.publicRepos,
    public_gists: contributorData.publicGists,
    // add more fields as needed
  });
}

async function insertContributorIssuesAndPRs(contributorData: ContributorData) {
  if (Array.isArray(contributorData.recentPRs)) {
    for await(const item of contributorData.recentPRs) {
      const type = item.pull_request ? 'pr' : 'issue';
      const { org, repo } = extractOrgAndRepoFromFullName(item.url);
      await DbService.insertContributorIssuePr({
        id: item.id.toString(),
        username: contributorData.login,
        org,
        repo,
        url: item.url,
        type,
        number: item.number,
        title: item.title,
        state: item.state,
        createdAt: 'createdAt' in item ? (item.createdAt as string) : '',
        updatedAt: 'updatedAt' in item ? (item.updatedAt as string) : '',
        closedAt: 'closedAt' in item ? (item.closedAt as string) : '',
        mergedAt: 'mergedAt' in item ? (item.mergedAt as string) : '',
        merged: 'merged' in item ? (item.merged as boolean) : false,
      });
    }
  }
}

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
interface TopicNode {
  topic?: { name?: string };
}
interface TopicsObject {
  nodes: TopicNode[];
}

function normalizeTopics(
  topics: TopicsObject | string[] | string | undefined
): string | undefined {
  if (Array.isArray(topics)) {
    if (
      topics.length > 0 &&
      typeof topics[0] === 'object' &&
      'name' in topics[0]
    ) {
      return (topics as { name?: string }[])
        .map(t => t.name)
        .filter(Boolean)
        .join(',');
    }
    return (topics as string[]).join(',');
  } else if (typeof topics === 'string') {
    return topics;
  } else if (
    topics &&
    typeof topics === 'object' &&
    Array.isArray((topics as TopicsObject).nodes)
  ) {
    return (topics as TopicsObject).nodes
      .map(n => n?.topic?.name)
      .filter(Boolean)
      .join(',');
  }
  return undefined;
}

function normalizeReadme(
  readme: { text?: string } | string | null | undefined
): string | undefined {
  if (readme && typeof readme === 'object' && 'text' in readme) {
    return readme.text;
  } else if (typeof readme === 'string') {
    return readme;
  }
  return undefined;
}

function normalizeRepo(
  repoObjRaw: ContributorRepo
): NormalizedRepo | undefined {
  if (isGraphQLRepo(repoObjRaw)) {
    return {
      id: repoObjRaw.id?.toString() ?? '',
      name: repoObjRaw.name || '',
      nameWithOwner: repoObjRaw.nameWithOwner,
      url: repoObjRaw.url || '',
      description: repoObjRaw.description || '',
      stargazerCount: repoObjRaw.stargazerCount ?? 0,
      forkCount: repoObjRaw.forkCount ?? 0,
      isPrivate: repoObjRaw.isPrivate ?? false,
      isFork: repoObjRaw.isFork ?? false,
      isArchived: repoObjRaw.isArchived ?? false,
      isDisabled: repoObjRaw.isDisabled ?? false,
      primaryLanguage:
        typeof repoObjRaw.primaryLanguage === 'string'
          ? repoObjRaw.primaryLanguage || undefined
          : repoObjRaw.primaryLanguage?.name || undefined,
      licenseInfo:
        typeof repoObjRaw.licenseInfo === 'string'
          ? repoObjRaw.licenseInfo || undefined
          : repoObjRaw.licenseInfo?.name || undefined,
      owner:
        typeof repoObjRaw.owner === 'string'
          ? repoObjRaw.owner
          : (repoObjRaw.owner?.login ?? ''),
      diskUsage: repoObjRaw.diskUsage ?? undefined,
      createdAt: repoObjRaw.createdAt ?? undefined,
      updatedAt: repoObjRaw.updatedAt ?? undefined,
      pushedAt: repoObjRaw.pushedAt ?? undefined,
      watchersCount: repoObjRaw.watchers?.totalCount ?? undefined,
      issuesCount: repoObjRaw.issues?.totalCount ?? undefined,
      pullRequestsCount: repoObjRaw.pullRequests?.totalCount ?? undefined,
      topics: normalizeTopics(repoObjRaw.repositoryTopics ?? repoObjRaw.topics),
      readme: normalizeReadme(repoObjRaw.readme),
    };
  } else if (isRestRepo(repoObjRaw)) {
    return {
      id: repoObjRaw.id?.toString() ?? repoObjRaw.node_id ?? '',
      name: repoObjRaw.name || '',
      nameWithOwner: repoObjRaw.full_name || '',
      url: repoObjRaw.html_url || '',
      description: repoObjRaw.description || '',
      stargazerCount: repoObjRaw.stargazers_count ?? 0,
      forkCount: repoObjRaw.forks_count ?? 0,
      isPrivate: repoObjRaw.private ?? false,
      isFork: repoObjRaw.fork ?? false,
      isArchived: repoObjRaw.archived ?? false,
      isDisabled: repoObjRaw.disabled ?? false,
      primaryLanguage: repoObjRaw.language || undefined,
      licenseInfo: repoObjRaw.license?.name || undefined,
      owner:
        typeof repoObjRaw.owner === 'string'
          ? repoObjRaw.owner
          : (repoObjRaw.owner?.login ?? ''),
      diskUsage: repoObjRaw.disk_usage ?? undefined,
      createdAt: repoObjRaw.created_at ?? undefined,
      updatedAt: repoObjRaw.updated_at ?? undefined,
      pushedAt: repoObjRaw.pushed_at ?? undefined,
      watchersCount: repoObjRaw.watchers_count ?? undefined,
      issuesCount: repoObjRaw.open_issues_count ?? undefined,
      pullRequestsCount: undefined, // REST API does not provide this directly
      topics: normalizeTopics(repoObjRaw.topics),
      readme: undefined, // REST API does not provide this directly
    };
  }
  return undefined;
}

async function insertContributorRepos(contributorData: ContributorData) {
  // 1. Collect all repos from issues and PRs
  const repoSet = new Set<string>();
  const repoRefs: { org: string; repo: string }[] = [];

  const items = [
    ...(Array.isArray(contributorData.recentPRs)
      ? contributorData.recentPRs
      : []),
    ...(Array.isArray((contributorData as any).issues)
      ? (contributorData as any).issues
      : []),
  ];

  for (const item of items) {
    if (item && item.url) {
      const { org, repo } = extractOrgAndRepoFromFullName(item.url);
      const key = `${org}/${repo}`;
      if (org && repo && !repoSet.has(key)) {
        repoSet.add(key);
        repoRefs.push({ org, repo });
      }
    }
  }

  // 2. Filter to only active repos using REST
  const apiClient = new GitHubApiClient();
  const contributorService = new ContributorService(apiClient);
  const repositoryService = new RepositoryService(apiClient);
  const activeRepoRefs: { org: string; repo: string }[] = [];
  for await (const { org, repo } of repoRefs) {
    try {
      const isActive = await contributorService.isActiveRepository(org, repo);
      if (isActive) {
        activeRepoRefs.push({ org, repo });
      }
    } catch (err) {
      console.warn(
        `[insertContributorRepos] Could not check active status for ${org}/${repo}:`,
        err
      );
    }
  }

  // 3. For only active repos, get details using RepositoryService GraphQL
  for await (const { org, repo } of activeRepoRefs) {
    try {
      const repoObjRaw = await repositoryService.getRepositoryGraphql(
        org,
        repo,
        30
      );
      if (!repoObjRaw) {
        console.warn(
          `[insertContributorRepos] No repository found for ${org}/${repo}`
        );
        continue;
      }
      const repoObj = normalizeRepo(repoObjRaw);
      if (!repoObj) {
        console.warn(
          '[insertContributorRepos] Skipping repo: could not normalize',
          repoObjRaw
        );
        continue;
      }
      if (!repoObj.id) {
        console.warn(
          '[insertContributorRepos] Skipping repo: missing id',
          repoObj
        );
        throw new Error(
          `Repository ID is required for ${org}/${repo}. Please check the data source.`
        );
      }

      await DbService.insertRepository({
        id: repoObj.id,
        name: repoObj.name,
        nameWithOwner: repoObj.nameWithOwner,
        url: repoObj.url,
        description: repoObj.description,
        stargazerCount: repoObj.stargazerCount,
        forkCount: repoObj.forkCount,
        isPrivate: repoObj.isPrivate,
        isFork: repoObj.isFork,
        isArchived: repoObj.isArchived,
        isDisabled: repoObj.isDisabled,
        primaryLanguage: repoObj.primaryLanguage,
        licenseInfo: repoObj.licenseInfo,
        owner: repoObj.owner,
        diskUsage: repoObj.diskUsage,
        createdAt: repoObj.createdAt,
        updatedAt: repoObj.updatedAt,
        pushedAt: repoObj.pushedAt,
        watchersCount: repoObj.watchersCount,
        issuesCount: repoObj.issuesCount,
        pullRequestsCount: repoObj.pullRequestsCount,
        topics: repoObj.topics,
        readme: repoObj.readme,
      });

      // await fetchAndLogWorkflows(
      //   contributorData.login,
      //   org,
      //   repo,
      //   repoObj.nameWithOwner
      // );

      // await fetchAndLogDependabotAlert(
      //   contributorData.login,
      //   org,
      //   repo,
      //   repoObj.nameWithOwner
      // );
    } catch (error) {
      console.error(
        `[insertContributorRepos] Error processing ${org}/${repo}:`,
        error
      );
    }
  }
}

// Place these helpers above insertContributorRepos so they are in scope and use the correct method names/signatures

async function fetchAndLogDependabotAlert(
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

async function fetchAndLogWorkflows(
  contributorLogin: string,
  org: string,
  repo: string,
  repoNameWithOwner: string
): Promise<void> {
  try {
    const apiClient = new GitHubApiClient();
    await apiClient.getAndTestGitHubToken();
    console.log(
      `[insertContributorRepos] Fetching workflows for ${contributorLogin}/${org}/${repo}`
    );
    const workflowService = new WorkflowService(apiClient);
    const workflows: WorkflowWithStatus[] =
      await workflowService.getWorkflowsWithStatus(org, repo);
    console.log(
      `[insertContributorRepos] Found ${workflows.length} workflows for ${org}/${repo}`
    );
    await DbService.init();
    for await (const workflow of workflows) {
      console.log(
        `[insertContributorRepos] Workflow: ${workflow.name} (${workflow.id}) - ${workflow.state}`
      );
      if (workflow.id) {
        const entity = mapOctokitWorkflowToEntity(workflow, `${org}/${repo}`, {
          id: workflow.lastRunId ?? undefined,
          status: workflow.lastRunStatus ?? undefined,
          created_at: workflow.lastRunDate ?? undefined,
          url: workflow.lastRunUrl ?? undefined,
        });
        if (entity.id !== undefined) {
          await DbService.insertWorkflow(entity as DbWorkflow);
        }
      }
    }
  } catch (error) {
    console.error(
      `Error fetching workflows for ${contributorLogin}/${repoNameWithOwner}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// --- Main workflow ---
export default async function run(
  generatedDirectory: string,
  configData: DataConfig
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );
    const contributorDataList = await fetchContributors(configData);
    // Deduplicate contributors by login
    const seenLogins = new Set<string>();
    const uniqueContributors = contributorDataList.filter(c => {
      if (!c.login) return false;
      if (seenLogins.has(c.login)) return false;
      seenLogins.add(c.login);
      return true;
    });
    console.log(
      '[TypeORM] Unique contributors to insert:',
      uniqueContributors.map(c => c.login)
    );
    const savedCount = 0;
    await DbService.init();
    for await(const contributorData of uniqueContributors) {
      console.log(
        `\nProcessing contributor: ${contributorData.login} (${contributorData.name})`
      );
      await insertContributor(contributorData);
      await insertContributorIssuesAndPRs(contributorData);
      await insertContributorRepos(contributorData);

      break; //savedCount++; TBD
    }

    console.log(
      `\n📊 Collected data for ${contributorDataList.length} contributors and saved ${savedCount} to database`
    );
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
