import { RepositoryItemExtened, PrSearchItem } from '../models.js';
import GitHubRequestor, {
  isRepositoryError,
  isGitHubRequestorError,
} from './github.js';
/**
 * Class for searching GitHub repositories with various criteria
 */
export default class GitHubSearcher {
  private requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  /**
   * Search GitHub repositories with given query and return results
   * @param query GitHub search query
   * @param maxResults Maximum number of results to return
   * @param includeArchived Whether to include archived repositories (default false)
   * @returns Array of SuggestedRepo objects
   */
  async searchRepositories(
    query: string,
    maxResults: number
  ): Promise<RepositoryItemExtened[]> {
    console.log(`Searching GitHub repositories with query: ${query}`);

    const repos: RepositoryItemExtened[] = [];

    // Use repoDataCollector instead of direct Octokit call
    const items = await this.requestor.getSearchRepository(
      query,
      maxResults,
      'updated',
      'desc'
    );

    // If we got an error instead of search results, return empty array
    if (isGitHubRequestorError(items)) {
      console.error(`Error searching repositories: ${items.errorMessage}`);
      return [];
    }

    for (const repo of items) {
      const extendedRepo: RepositoryItemExtened =
        await this.processRepositoryItem(repo);

      repos.push(extendedRepo);

      if (repos.length >= maxResults) {
        break;
      }
    }

    console.log(`Found ${repos.length} repositories matching query`);
    return repos;
  }

  /**
   * Process a repository item from GitHub search results
   * @param repo GitHub repository item from search results
   * @returns Extended repository item with additional information
   */
  private async processRepositoryItem(
    repo: any // Using 'any' type for repo
  ): Promise<RepositoryItemExtened> {
    const [org, repo_name] = repo.full_name.split('/') as [string, string];

    // Get last commit from RepoDataCollector
    const commits = await this.requestor.getCommits(org, repo_name, 1);

    let lastCommitDate = 'N/A';
    if (!isGitHubRequestorError(commits) && commits.length > 0) {
      lastCommitDate = new Date(commits[0].commit.committer?.date || '')
        .toISOString()
        .split('T')[0];
    } else if (isGitHubRequestorError(commits)) {
      console.warn(
        `Could not fetch commit data for ${repo.full_name}: ${commits.errorMessage}`
      );
    }

    return {
      ...repo,
      last_commit_date: lastCommitDate,
      org,
      repo: repo_name,
    };
  }

  /**
   * Search for repositories in specific organizations with language filters
   * @param orgs Array of GitHub organization names to search
   * @param languages Array of programming languages to filter by
   * @param topics Array of topics to filter by
   * @param includeArchived Whether to include archived repositories (default false)
   * @returns Array of SuggestedRepo objects
   */
  async searchOrgRepositories(
    orgs: string[],
    languages: string[],
    topics: string[],
    limit: number
  ): Promise<RepositoryItemExtened[]> {
    const allRepos: RepositoryItemExtened[] = [];

    for (const org of orgs) {
      console.log(`\nSearching in organization: ${org}`);

      for (const language of languages) {
        for (const topic of topics) {
          // Build the query string
          let query = `org:${org} language:${language} topic:${topic}`;

          console.log(`- Searching for ${language} repos in ${org}`);
          const reposForLanguage = await this.searchRepositories(query, limit);
          console.log(
            `- Found ${reposForLanguage.length} ${language} repositories`
          );
          allRepos.push(...reposForLanguage);
        }
      }
    }

    return allRepos;
  }

  /**
   * Find trending repositories related to Azure
   * @param daysBack Number of days to look back for trending repos
   * @returns Array of SuggestedRepo objects
   */
  async findTrendingAzureRepos(
    daysBack = 30,
    minStars = 10
  ): Promise<RepositoryItemExtened[]> {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const dateString = date.toISOString().split('T')[0];

    console.log(`Looking for trending Azure repos updated since ${dateString}`);

    return this.searchRepositories(
      `topic:azure created:>=${dateString} stars:>${minStars}`,
      50
    );
  }

  /**
   * Search for repositories owned by Microsoft organizations and contributed to by
   * Azure Cloud Advocates in the last 30 days that are not in the existing repos list
   * @param existingRepos Array of repository URLs to exclude from the results
   * @param daysBack Number of days to look back for contributions
   * @returns Array of repositories matching the criteria
   */
  async findContributedRepos(
    orgs: string[] = [],
    contributors: string[] = [],
    pastDate: string
  ): Promise<PrSearchItem[]> {
    console.log(
      `Searching for repos with Cloud Advocate PR contributions since ${pastDate}`
    );

    const prSearchItems: PrSearchItem[] = [];

    // For each organization
    for (const org of orgs) {
      // For each contributor
      for (const contributor of contributors) {
        const query = `org:${org} author:${contributor} is:pr created:>=${pastDate}`;

        const result = await this.requestor.searchIssuesAndPrs(
          query,
          1,
          10,
          'created',
          'desc'
        );

        if (isGitHubRequestorError(result)) {
          console.warn(
            `Error searching PRs for ${query}: ${result.errorMessage}`
          );
          continue; // Skip this iteration and continue with next contributor
        }

        console.log(`${query} - ${result.length} `);
        prSearchItems.push(...result);
      }
    }

    console.log(
      `Found ${prSearchItems.length} pull requests from specified contributors`
    );
    return prSearchItems;
  }

  /**
   * Find repositories similar to a given repository
   * @param repoFullName Full repository name (format: owner/repo)
   * @returns Array of SuggestedRepo objects
   */
  async findSimilarRepos(
    repoFullName: string,
    limit: number
  ): Promise<RepositoryItemExtened[]> {
    console.log(`Finding repositories similar to ${repoFullName}`);

    const [owner, repo] = repoFullName.split('/');

    // Get repository information to extract topics and language
    const repoInfo = await this.requestor.getRepo(owner, repo);

    if (isRepositoryError(repoInfo) || isGitHubRequestorError(repoInfo)) {
      const errorMessage = isRepositoryError(repoInfo)
        ? repoInfo.error
        : repoInfo.errorMessage;

      console.error(
        `Repository ${owner}/${repo} not found or error occurred: ${errorMessage}`
      );
      return [];
    }

    const language = repoInfo.language?.toLowerCase() || '';
    const topics = repoInfo.topics || [];

    // If we have topics, use them to find similar repos
    if (topics.length > 0) {
      const topicsQuery = topics
        .slice(0, 3)
        .map(topic => `topic:${topic}`)
        .join(' ');
      const query = `${topicsQuery} language:${language} -repo:${repoFullName}`;

      console.log(`Searching for similar repos with query: ${query}`);
      return this.searchRepositories(query, limit);
    }

    return [];
  }
}
