import { GitHubApiClient } from './client.js';
import type { PrSearchItem } from './models.js';
import { getDaysAgo } from '../utils/datetime.js';
export class IssueService {
  constructor(private api: GitHubApiClient) {}

  /**
   * Fetches all issues and PRs a user has touched (author, assignee, commenter) in the last N days using the REST search API.
   * @param username - The GitHub username
   * @param daysAgo - Number of days in the past to include
   */
  async getRecentInvolvedIssues(
    username: string,
    daysAgo: number
  ): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();

    const sinceDate = getDaysAgo(daysAgo);
    const query = `involves:${username} updated:>=${sinceDate}`;
    const results: PrSearchItem[] = [];
    let page = 1;
    let totalCount = 0;
    do {
      const { data } = await octokit.rest.search.issuesAndPullRequests({
        q: query,
        advanced_search: 'true',
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page,
      });
      // Include both issues and PRs
      results.push(...(data.items as PrSearchItem[]));
      totalCount = data.total_count;
      page++;
      if (page > 10) break;
    } while (results.length < totalCount);
    // Deduplicate by id or url
    const seen = new Set<string>();
    const deduped = results.filter(issue => {
      const key = issue.id ? String(issue.id) : issue.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return deduped;
  }
}
