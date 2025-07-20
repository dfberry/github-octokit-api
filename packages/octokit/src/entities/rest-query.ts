// Generic REST query utility for GitHub Search API
import { Octokit } from '@octokit/rest';

/*

http://api.github.com/search/issues?q={query}&advanced_search=true
https://github.blog/changelog/2025-03-06-github-issues-projects-api-support-for-issues-advanced-search-and-more/

*/

export interface GitHubRestQueryOptions {
  token: string;
  query: string;
  sort?: 'updated' | 'created' | 'comments';
  order?: 'desc' | 'asc';
  per_page?: number;
  maxPages?: number;
  advanced_search?: string;
}

export async function githubRestSearchIssues<T = any>({
  token,
  query,
  sort = 'updated',
  order = 'desc',
  per_page = 100,
  maxPages = 10,
  advanced_search = 'true',
}: GitHubRestQueryOptions): Promise<T[]> {
  const octokit = new Octokit({ auth: token });
  const results: T[] = [];
  let page = 1;
  let totalCount = 0;
  do {
    const { data } = await octokit.rest.search.issuesAndPullRequests({
      q: query,
      sort,
      order,
      per_page,
      page,
      advanced_search: 'true',
    });
    results.push(...(data.items as T[]));
    totalCount = data.total_count;
    page++;
    if (page > maxPages) break;
  } while (results.length < totalCount);
  return results;
}
