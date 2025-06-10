import GitHubRequestor, { isGitHubRequestorError } from './github.js';
import { ContributorData, ContributorRepo, PrSearchItem } from '../models.js';

/**
 * Class for retrieving contributor data from GitHub
 */
export default class GitHubContributor {
  protected requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  /**
   * Get basic data about a contributor
   * @param username GitHub username
   * @returns Contributor data object
   */
  async getContributorData(username: string): Promise<
    ContributorData & {
      contributedReposList?: any[];
      repositoriesList?: any[];
      starredRepositoriesList?: any[];
      issuesList?: any[];
      pullRequestsList?: any[];
    }
  > {
    console.log(`Fetching contributor data for ${username}`);

    try {
      const userData = await this.requestor.getUserData(username);

      if (isGitHubRequestorError(userData)) {
        console.error(`Error fetching user data: ${userData.errorMessage}`);

        return {
          login: username,
          name: username,
          avatarUrl: '',
          bio: '',
          company: '',
          blog: '',
          location: '',
          twitter: '',
          followers: 0,
          following: 0,
          publicRepos: 0,
          publicGists: 0,
          repos: [],
          recentPRs: [],
          contributedReposList: [],
          repositoriesList: [],
          starredRepositoriesList: [],
          issuesList: [],
          pullRequestsList: [],
        };
      }

      // Use the new lists from getUserData
      return {
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        bio: userData.bio || '',
        company: userData.company || '',
        blog: userData.blog || '',
        location: userData.location || '',
        twitter: userData.twitter_username || '',
        followers: userData.followers || 0,
        following: userData.following || 0,
        publicRepos: userData.public_repos || 0,
        publicGists: userData.public_gists || 0,
        repos: userData.contributed_repositories_list || [],
        recentPRs: userData.pull_requests_list || [],
        contributedReposList: userData.contributed_repositories_list || [],
        repositoriesList: userData.repositories_list || [],
        starredRepositoriesList: userData.starred_repositories_list || [],
        issuesList: userData.issues_list || [],
        pullRequestsList: userData.pull_requests_list || [],
      };
    } catch (error) {
      console.error(`Error in getContributorData: ${error}`);
      // Return minimal data if there's an error
      return {
        login: username,
        name: username,
        avatarUrl: '',
        bio: '',
        company: '',
        blog: '',
        location: '',
        twitter: '',
        followers: 0,
        following: 0,
        publicRepos: 0,
        publicGists: 0,
        repos: [],
        recentPRs: [],
        contributedReposList: [],
        repositoriesList: [],
        starredRepositoriesList: [],
        issuesList: [],
        pullRequestsList: [],
      };
    }
  }

  /**
   * Get repositories a contributor has contributed to within specified organizations
   * @param username GitHub username
   * @param orgs List of GitHub organization names to search within
   * @returns Array of repositories the contributor has contributed to
   */
  async getContributorRepositories(
    username: string,
    orgs: string[]
  ): Promise<ContributorRepo[]> {
    console.log(
      `Fetching repositories for contributor ${username} in ${orgs.join(', ')}`
    );
    const contributorRepos: ContributorRepo[] = [];

    try {
      for (const org of orgs) {
        // Search for repositories the user has contributed to in this organization
        // Using the search API to find repos where the user is a contributor
        const query = `org:${org} user:${username} fork:true`;
        const repos = await this.requestor.getSearchRepository(query, 50);

        if (isGitHubRequestorError(repos)) {
          console.warn(
            `Error fetching repos for ${username} in ${org}: ${repos.errorMessage}`
          );
          continue;
        }

        // Convert to ContributorRepo format
        for (const repo of repos) {
          if (repo.full_name) {
            contributorRepos.push({
              fullName: repo.full_name,
              url: repo.html_url || `https://github.com/${repo.full_name}`,
              description: repo.description || '',
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              language: repo.language || '',
              lastUpdated: repo.updated_at || '',
            });
          }
        }

        // Also search for PRs the user has opened in this org's repos
        const prQuery = `org:${org} author:${username} is:pr`;
        const prRepos = await this.requestor.searchIssuesAndPrs(
          prQuery,
          1,
          100
        );

        if (!isGitHubRequestorError(prRepos)) {
          // Extract unique repository names from PRs
          const uniquePrRepos = new Map<string, string>();

          for (const pr of prRepos) {
            const repoUrl = pr.repository_url;
            const repoFullName = repoUrl.replace(
              'https://api.github.com/repos/',
              ''
            );

            // Only add if we haven't already found it
            if (
              !uniquePrRepos.has(repoFullName) &&
              !contributorRepos.some(r => r.fullName === repoFullName)
            ) {
              uniquePrRepos.set(repoFullName, pr.html_url.split('/pull/')[0]);
            }
          }

          // For each unique repo, get more details
          for (const [repoFullName, repoUrl] of uniquePrRepos.entries()) {
            try {
              const [org, repoName] = repoFullName.split('/');
              const repoDetails = await this.requestor.getRepo(org, repoName);

              if (!isGitHubRequestorError(repoDetails)) {
                contributorRepos.push({
                  fullName: repoFullName,
                  url: repoUrl,
                  description: repoDetails.description || '',
                  stars: repoDetails.stargazers_count || 0,
                  forks: repoDetails.forks_count || 0,
                  language: repoDetails.language || '',
                  lastUpdated: repoDetails.updated_at || '',
                });
              }
            } catch (err) {
              console.warn(`Error getting details for ${repoFullName}: ${err}`);
            }
          }
        }
      }

      // Sort by stars (most stars first)
      contributorRepos.sort((a, b) => b.stars - a.stars);
      return contributorRepos;
    } catch (error) {
      console.error(`Error in getContributorRepositories: ${error}`);
      return [];
    }
  }

  /**
   * Get recent PRs from a contributor within specified organizations
   * @param username GitHub username
   * @param orgs List of GitHub organization names to search within
   * @param sinceDate ISO date string to search from (e.g., "2025-04-12")
   * @returns Array of PRs from the contributor in the specified time range
   */
  async getContributorPRs(
    username: string,
    orgs: string[],
    sinceDate: string
  ): Promise<PrSearchItem[]> {
    console.log(`Fetching PRs for contributor ${username} since ${sinceDate}`);
    const allPRs: PrSearchItem[] = [];

    try {
      for (const org of orgs) {
        const query = `org:${org} author:${username} is:pr created:>=${sinceDate}`;
        const prs = await this.requestor.searchIssuesAndPrs(query, 1, 50);

        if (isGitHubRequestorError(prs)) {
          console.warn(
            `Error fetching PRs for ${username} in ${org}: ${prs.errorMessage}`
          );
          continue;
        }

        allPRs.push(...prs);
      }

      // Sort by creation date (newest first)
      allPRs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return allPRs;
    } catch (error) {
      console.error(`Error in getContributorPRs: ${error}`);
      return [];
    }
  }
}
