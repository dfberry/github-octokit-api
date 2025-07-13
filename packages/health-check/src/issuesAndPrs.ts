import type { ContributorData, PrSearchItem } from './github2/models.js';
import { IssueService } from './github2/issue-service.js';
import logger from './logger.js';
import type DataConfig from './initialize-with-data.js';
import { GitHubContributorIssuePrEntity } from '@dfb/db';
import GitHubApiClient from './github2/api-client.js';
import {
  normalizePrSearchItemToContributorIssuePrEntity,
  // normalizeIssueToContributorIssuePrEntity,
} from './utils/normalize.js';
/**
 * Insert unique issues and PRs for a contributor into the database.
 */
export async function processContributorIssuesAndPRs(
  configData: DataConfig,
  contributorData: ContributorData
): Promise<PrSearchItem[]> {
  let count = 0;
  const apiClient = new GitHubApiClient();
  const issueService = new IssueService(apiClient);
  const issuePrEntities: GitHubContributorIssuePrEntity[] = [];

  // Use the REST API /search/issues with involves:USERNAME for the last 7 days
  const items: PrSearchItem[] = await issueService.getRecentInvolvedIssues(
    contributorData.login,
    7
  );
  items.forEach(prSearchItem => {
    const normalized = normalizePrSearchItemToContributorIssuePrEntity(
      prSearchItem,
      contributorData.login
    );
    issuePrEntities.push(normalized);
    count++;
  });

  // Batch insert if any
  if (issuePrEntities.length > 0) {
    await configData.db.databaseServices.contributorIssuePrService.insertBatch(
      issuePrEntities
    );
  }
  if (count > 0) {
    logger.info(
      `\n\n📊 IssuesAndPRs for ${contributorData.login} = ${count}\n`
    );
  }
  return items;
}
