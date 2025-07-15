import logger from './utils/logger.js';
import { GitHubContributorIssuePrEntity } from '@dfb/db';
import { extractOrgRepoFromIssueUrl } from './utils/urls.js';
import { IssueService, OctokitSearchIssueRest } from '@dfb/octokit';
import DataConfig from './config/index.js';

const days = 15;

/**
 * Insert unique issues and PRs for a contributor into the database.
 */
export async function fetchPrsFromGitHub(
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

  const issueService = new IssueService(configData.githubClient);

  for await (const contributor of configData.contributors) {
    if (!contributor || !contributor.id) {
      logger.warn('Skipping contributor with no login.');
      continue;
    }

    // Use the REST API /search/issues with involves:USERNAME for the last 7 days
    const gitHubItems: OctokitSearchIssueRest[] =
      await issueService.getRecentInvolvedIssues(contributor.id, days);

    const dbItems = gitHubItems.map(item => {
      const dbItem = octokitSearchIssueRestToGitHubContributorIssuePrEntity(
        item,
        contributor.id
      );
      configData?.issues?.add(dbItem);
      return dbItem;
    });
    await configData?.db?.databaseServices?.contributorIssuePrService.insertBatch(
      dbItems
    );

    logger.info(
      `Fetched ${dbItems.length} issues/PRs for contributor ${contributor.id}`
    );
  }
}
export function octokitSearchIssueRestToGitHubContributorIssuePrEntity(
  item: OctokitSearchIssueRest,
  username: string
): GitHubContributorIssuePrEntity {
  const [org, repo] = extractOrgRepoFromIssueUrl(item.url || '');

  const type =
    ('pull_request' in item && item.pull_request !== undefined) ||
    'pull_request_url' in item ||
    'pull_request_html_url' in item
      ? 'pr'
      : 'issue';

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
    created_at: item.created_at ?? '',
    updated_at: item.updated_at ?? '',
    closed_at: item.closed_at ?? '',
    merged_at: (item as any).merged_at ?? '', // Only present for PRs
    merged:
      typeof (item as any).merged === 'boolean' ? (item as any).merged : false,
    // The following fields are left undefined unless you want to map them:
    document_category: undefined,
    document_summary: undefined,
    document_summary_embedding: undefined,
    document: undefined,
    document_embedding: undefined,
  };
}
