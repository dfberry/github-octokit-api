import type { ContributorData, PrSearchItem } from './github2/models.js';
import { IssueService } from './github2/issue-service.js';
import logger from './logger.js';
import type DataConfig from './initialize-with-data.js';
import { GitHubContributorIssuePrEntity } from '@dfb/db';
import GitHubApiClient from './github2/api-client.js';
/**
 * Insert unique issues and PRs for a contributor into the database.
 */
export async function processContributorIssuesAndPRs(
  configData: DataConfig,
  contributorData: ContributorData
): Promise<any> {
  if (Array.isArray(contributorData.recentPRs)) {
    let count = 0;
    const apiClient = new GitHubApiClient();
    const issueService = new IssueService(apiClient);
    const issuePrEntities: GitHubContributorIssuePrEntity[] = [];

    const prSearchItems: PrSearchItem[] = [];

    for await (const repo of (contributorData.repos || [])) {
      logger.info(`Fetching issues for repo: ${repo}`);
      const [owner, repoName] = repo.full_name.split('/');

      const issues = await issueService.getRecentIssues(
        owner,
        repoName,
        7);

      prSearchItems.push(...issues);
    }

    prSearchItems.map((prSearchItem) => {
      const normalizedIssues = normalizePrSearchItemToContributorIssuePrEntity(prSearchItem, contributorData.username);
      issuePrEntities.push(normalizedIssues);
    });

    // Batch insert if any
    if (issuePrEntities.length > 0) {
      await configData.db.databaseServices.contributorIssuePrService.insertBatch(
        issuePrEntities
      );
    }
    logger.info(
      `\n\n📊 IssuesAndPRs data collected for ${count} issues and prs and saved to database\n\n`
    );
  }
}
