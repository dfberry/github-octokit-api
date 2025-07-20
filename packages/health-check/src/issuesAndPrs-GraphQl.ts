import logger from './utils/logger.js';
import pLimit from 'p-limit';
import { GitHubContributorIssuePrEntity } from '@dfb/db';
import { IssueServiceGraphQL } from '@dfb/octokit';
import { extractOrgRepoFromIssueUrl } from './utils/urls.js';
import type {
  GraphQLUserIssuesAndPRs,
  GraphQLIssueNode,
  GraphQLPullRequestNode,
} from '@dfb/octokit';
import DataConfig from './config/index.js';

/**
 * Insert unique issues and PRs for a contributor into the database using GraphQL.
 */
export async function fetchPrsFromGitHubGraphQL(
  configData: DataConfig
): Promise<void> {
  if (!configData || !configData.githubClient) {
    logger.error(
      'GitHub API client is not initialized. Please check your configuration and ensure a valid GitHub token is provided.'
    );
    return;
  }

  if (!configData.contributors || configData.contributors.size === 0) {
    logger.warn('No contributors so no issues.');
    return;
  }

  const issueService = new IssueServiceGraphQL(configData.githubClient);
  const limit = pLimit(configData.pLimit); // Adjust concurrency as needed

  const contributors = Array.from(configData.contributors);
  await Promise.all(
    contributors.map(contributor =>
      limit(async () => {
        if (!contributor || !contributor.id) {
          logger.warn('Skipping contributor with no login.');
          return;
        }

        const dbItems = await fetchAndInsertGraphQL(
          issueService,
          contributor.id,
          configData
        );
        logger.info(
          `Fetched ${dbItems.length} issues/PRs for contributor ${contributor.id}`
        );
      })
    )
  );
}

/**
 * Fetch recent issues/PRs for a contributor, normalize, add to config, and insert into DB (GraphQL version).
 */
async function fetchAndInsertGraphQL(
  issueService: IssueServiceGraphQL,
  contributorId: string,
  configData: DataConfig
): Promise<GitHubContributorIssuePrEntity[]> {
  let data: GraphQLUserIssuesAndPRs | null = null;
  try {
    data = await issueService.getRecentInvolvedIssues(
      contributorId,
      configData.githubIssuesDaysAgo
    );
  } catch (error) {
    logger.warn(
      `Failed to fetch issues/PRs for ${contributorId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    data = null;
    return [];
  }

  const dbItems: GitHubContributorIssuePrEntity[] = [];
  if (data && data.user) {
    // Issues
    for (const item of data.user.issues.nodes as GraphQLIssueNode[]) {
      const dbItem = graphQlIssueNodeToGitHubContributorIssuePrEntity(
        item,
        contributorId,
        'issue'
      );
      configData?.issues?.add(dbItem);
      dbItems.push(dbItem);
    }
    // PRs
    for (const item of data.user.pullRequests
      .nodes as GraphQLPullRequestNode[]) {
      const dbItem = graphQlIssueNodeToGitHubContributorIssuePrEntity(
        item,
        contributorId,
        'pr'
      );
      configData?.issues?.add(dbItem);
      dbItems.push(dbItem);
    }
  }
  if (dbItems) {
    await configData?.db?.databaseServices?.contributorIssuePrService.insertBatch(
      dbItems
    );
  }
  return dbItems;
}

export function graphQlIssueNodeToGitHubContributorIssuePrEntity(
  item: GraphQLIssueNode | GraphQLPullRequestNode,
  username: string,
  type: 'issue' | 'pr'
): GitHubContributorIssuePrEntity {
  const [org, repo] = extractOrgRepoFromIssueUrl(item.url || '');

  return {
    id: item.id ? String(item.id) : '',
    username,
    org: org || '',
    repo: repo || '',
    url: item.url || '',
    type,
    number: item.number ?? 0,
    title: item.title ?? '',
    state: item.state ?? '',
    created_at: item.createdAt ?? '',
    updated_at: item.updatedAt ?? '',
    closed_at: item.closedAt ?? '',
    merged_at:
      type === 'pr' && 'mergedAt' in item
        ? ((item as GraphQLPullRequestNode).mergedAt ?? '')
        : '',
    merged: false, // GraphQL does not provide a boolean merged field directly
    document_category: undefined,
    document_summary: undefined,
    document_summary_embedding: undefined,
    document: undefined,
    document_embedding: undefined,
  };
}
