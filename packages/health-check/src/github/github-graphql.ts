// @ts-nocheck
import { Octokit } from 'octokit';
/**
 * GitHubGraphQL class for making optimized batch requests to GitHub GraphQL API
 * This helps reduce the number of API calls by combining multiple queries
 */
export default class GitHubGraphQL {
  private octokit: Octokit;

  constructor(token: string) {
    console.log('Initializing GitHubGraphQL with token');
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Fetch comprehensive repository data in a single GraphQL query
   * This replaces multiple REST API calls (repo info, topics, issues, PRs, workflows, etc.)
   *
   * @param owner Repository owner/organization name
   * @param name Repository name
   */
  async getRepositoryData(owner: string, name: string) {
    const query = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          name
          description
          url
          homepageUrl
          isPrivate
          isArchived
          isDisabled
          isTemplate
          stargazerCount
          forkCount
          watchers { totalCount }
          openIssues: issues(states: OPEN) { totalCount }
          pullRequests(states: OPEN) { totalCount }
          updatedAt
          pushedAt
          topics: repositoryTopics(first: 100) {
            nodes {
              topic { name }
            }
          }
          defaultBranchRef {
            name
            target {
              ... on Commit {
                history(first: 1) {
                  nodes {
                    message
                    committedDate
                    author {
                      name
                      email
                      user {
                        login
                        avatarUrl
                      }
                    }
                  }
                }
              }
            }
          }
          vulnerabilityAlerts(first: 10, states: OPEN) {
            totalCount
            nodes {
              securityVulnerability {
                package { name }
                severity
                vulnerableVersionRange
                advisory {
                  summary
                  description
                }
              }
              createdAt
            }
          }
          workflows: object(expression: "HEAD:.github/workflows") {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.octokit.graphql(query, { owner, name });
      return response;
    } catch (error) {
      console.error(`Error fetching repository data via GraphQL: ${error}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Batch fetch basic data for multiple repositories in a single request
   *
   * @param repositories Array of {owner, name} objects
   */
  async batchGetRepositoriesBasicData(
    repositories: Array<{ owner: string; name: string }>
  ) {
    // Construct a dynamic query for multiple repositories
    const fragments = repositories
      .map(
        (repo, index) => `
      repo${index}: repository(owner: "${repo.owner}", name: "${repo.name}") {
        name
        description
        url
        stargazerCount
        forkCount
        openIssues: issues(states: OPEN) { totalCount }
        pullRequests(states: OPEN) { totalCount }
        updatedAt
        topics: repositoryTopics(first: 20) {
          nodes { topic { name } }
        }
      }
    `
      )
      .join('\n');

    const query = `
      query {
        ${fragments}
      }
    `;

    try {
      const response = await this.octokit.graphql(query);
      return response;
    } catch (error) {
      console.error(`Error batch fetching repositories via GraphQL: ${error}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Search for repositories and get comprehensive data in one request
   *
   * @param searchQuery GitHub search query
   * @param limit Maximum number of repositories to return
   */
  async searchRepositories(searchQuery: string, limit: number = 10) {
    const query = `
      query($searchQuery: String!, $limit: Int!) {
        search(query: $searchQuery, type: REPOSITORY, first: $limit) {
          repositoryCount
          nodes {
            ... on Repository {
              name
              owner { login }
              description
              url
              stargazerCount
              forkCount
              openIssues: issues(states: OPEN) { totalCount }
              pullRequests(states: OPEN) { totalCount }
              updatedAt
              pushedAt
              topics: repositoryTopics(first: 20) {
                nodes { topic { name } }
              }
              defaultBranchRef {
                name
                target {
                  ... on Commit {
                    history(first: 1) {
                      nodes {
                        committedDate
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.octokit.graphql(query, {
        searchQuery,
        limit,
      });
      return response;
    } catch (error) {
      console.error(`Error searching repositories via GraphQL: ${error}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Fetch contributor data and their recent activity in a single query
   *
   * @param username GitHub username
   * @param orgFilter Optional organization filter
   * @param limit Number of repositories to return
   */
  async getContributorWithActivity(
    username: string,
    orgFilter?: string,
    limit: number = 10
  ) {
    // Build the organization filter part of the query if provided
    const orgCondition = orgFilter ? `, user:${orgFilter}` : '';

    const query = `
      query($username: String!, $contributionsQuery: String!, $limit: Int!) {
        user(login: $username) {
          login
          name
          bio
          company
          location
          avatarUrl
          url
          twitterUsername
          followers { totalCount }
          following { totalCount }
          repositories { totalCount }
          
          # Get recent contributions
          contributionsCollection {
            totalRepositoryContributions
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            
            # Sample of recent commits
            commitContributionsByRepository(maxRepositories: 5) {
              repository {
                nameWithOwner
                url
              }
              contributions {
                totalCount
              }
            }
          }
        }
        
        # Find recent PRs from this user (optional org filter)
        recentPRs: search(query: "is:pr author:$username${orgCondition}", type: ISSUE, first: $limit) {
          nodes {
            ... on PullRequest {
              title
              url
              repository {
                nameWithOwner
              }
              createdAt
              state
            }
          }
        }
      }
    `;

    try {
      const contributionsQuery = `is:pr author:${username}${orgCondition}`;
      const response = await this.octokit.graphql(query, {
        username,
        contributionsQuery,
        limit,
      });
      return response;
    } catch (error) {
      console.error(`Error fetching contributor data via GraphQL: ${error}`);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Enhanced user search with fallback mechanisms to handle the
   * "users cannot be searched" error
   *
   * @param username GitHub username to search for
   * @param fallbackToREST Whether to fall back to REST API if GraphQL fails
   */
  async robustUserSearch(
    username: string,
    fallbackToREST = true
  ): Promise<any> {
    // First try direct user lookup via GraphQL (most efficient)
    try {
      const query = `
        query($username: String!) {
          user(login: $username) {
            login
            name
            bio
            company
            location
            email
            avatarUrl
            url
            twitterUsername
            followers { totalCount }
            following { totalCount }
            repositories { totalCount }
            contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalRepositoriesWithContributedCommits
            }
          }
        }
      `;

      const response = await this.octokit.graphql(query, { username });
      if (response.user) {
        return {
          success: true,
          method: 'graphql-direct',
          data: response.user,
        };
      }
    } catch (error) {
      console.warn(
        `GraphQL direct user lookup failed for ${username}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue to fallback methods
    }

    // Try user search via GraphQL
    try {
      const query = `
        query($searchQuery: String!) {
          search(query: $searchQuery, type: USER, first: 1) {
            userCount
            nodes {
              ... on User {
                login
                name
                bio
                company
                location
                email
                avatarUrl
                url
                twitterUsername
                followers { totalCount }
                following { totalCount }
                repositories { totalCount }
              }
            }
          }
        }
      `;

      const response = await this.octokit.graphql(query, {
        searchQuery: `user:${username}`,
      });

      if (
        response.search.userCount > 0 &&
        response.search.nodes.length > 0 &&
        response.search.nodes[0].login.toLowerCase() === username.toLowerCase()
      ) {
        return {
          success: true,
          method: 'graphql-search',
          data: response.search.nodes[0],
        };
      }
    } catch (error) {
      console.warn(
        `GraphQL user search failed for ${username}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue to fallback methods
    }

    // Fall back to REST API if enabled
    if (fallbackToREST) {
      try {
        const response = await this.octokit.rest.users.getByUsername({
          username,
        });
        return {
          success: true,
          method: 'rest-direct',
          data: response.data,
        };
      } catch (error) {
        console.error(
          `All methods failed for ${username}: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          success: false,
          method: 'all-failed',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: false,
      method: 'all-graphql-failed',
      error: `Could not find user ${username} using GraphQL methods`,
    };
  }
}
