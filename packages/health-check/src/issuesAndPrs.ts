import { DbService } from './typeorm/db-service.js';
import { extractOrgAndRepoFromFullName } from './utils/regex.js';
import type { ContributorData } from './github2/models.js';
import { PrSearchItem } from './github2/models.js';

/**
 * Insert unique issues and PRs for a contributor into the database.
 */
export async function insertContributorIssuesAndPRs(
  contributorData: ContributorData
) {
  if (Array.isArray(contributorData.recentPRs)) {
    let count = 0;

    // get unique issues and PRs from recentPRs
    const uniqueItems = new Map<string, PrSearchItem>();
    for (const item of contributorData.recentPRs) {
      const key = `${item.id}-${item.url}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    }

    console.log(
      `Issues/PR - reduced from ${contributorData.recentPRs.length} to ${uniqueItems.size} unique items`
    );

    for await (const item of uniqueItems.values()) {
      const type = item.pull_request ? 'pr' : 'issue';
      const { org, repo } = extractOrgAndRepoFromFullName(item.url);

      console.log(`Issue/PR: ${item.id} - in ${org}/${repo}`);

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
      count++;
    }
    console.log(
      `\n\n📊 IssuesAndPRs data collected for ${count} issues and prs and saved to database\n\n`
    );
  }
}
