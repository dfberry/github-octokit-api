import GitHubApiClient from './api-client.js';
import type { PrSearchItem } from '../models.js';

export class IssueService {
  constructor(private api: GitHubApiClient) {}

  /**
   * Fetches all issues for a repo where created, updated, or closed is within the last N days.
   * Uses the GitHub REST search API for date filtering.
   * @param owner - The repo owner
   * @param repo - The repo name
   * @param daysAgo - Number of days in the past to include
   */
  async getRecentIssues(
    owner: string,
    repo: string,
    daysAgo: number
  ): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();
    const daysAgoMs = daysAgo * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - daysAgoMs);
    const sinceDate = `${since.toISOString().slice(0, 10)} (last ${daysAgo} days)`;
    // Search for issues and PRs created, updated, or closed in the last N days
    const query = [
      `repo:${owner}/${repo}`,
      `((created:>=${sinceDate}) OR (updated:>=${sinceDate}) OR (closed:>=${sinceDate}))`,
    ].join(' ');
    const results: PrSearchItem[] = [];
    let page = 1;
    let totalCount = 0;
    do {
      const { data } = await octokit.rest.search.issuesAndPullRequests({
        q: query,
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        page,
      });
      // Only include issues (not PRs)
      results.push(...(data.items as PrSearchItem[]));
      totalCount = data.total_count;
      page++;
      // GitHub search API only returns up to 1000 results
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

  async getIssues(owner: string, repo: string): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    });
    return data as PrSearchItem[];
  }

  async getIssuesGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<PrSearchItem[]> {
    const graphql = this.api.getGraphql();
    const query = `
      fragment IssueFields on Issue {
        id
        number
        title
        url
        state
        createdAt
        updatedAt
        closedAt
        author { login url avatarUrl }
      }
      fragment PRFields on PullRequest {
        id
        number
        title
        url
        state
        createdAt
        updatedAt
        closedAt
        author { login url avatarUrl }
        merged
        mergedAt
      }
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          issues(first: ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { ...IssueFields }
          }
          pullRequests(first: ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { ...PRFields }
          }
        }
      }
    `;
    const result: unknown = await graphql.graphql(query, { owner, repo });
    // Narrow type for result
    const issues =
      (result &&
        typeof result === 'object' &&
        'repository' in result &&
        (result as any).repository?.issues?.nodes) ||
      [];
    return issues as PrSearchItem[];
  }

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
    const daysAgoMs = daysAgo * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - daysAgoMs);
    const sinceDate = `${since.toISOString().slice(0, 10)} (last ${daysAgo} days)`;
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

export default IssueService;
