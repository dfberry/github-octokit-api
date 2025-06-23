// @ts-nocheck
import { cat } from 'chromadb-default-embed';
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
          nameWithOwner
          owner { login url avatarUrl }
          description
          url
          createdAt
          updatedAt
          pushedAt
          stargazerCount
          forkCount
          isPrivate
          isFork
          isArchived
          isDisabled
          primaryLanguage { name color }
          licenseInfo { key name spdxId url }
          diskUsage
          openIssues: issues(states: OPEN) { totalCount }
          openPRs: pullRequests(states: OPEN) { totalCount }
          watchers { totalCount }
          topics: repositoryTopics(first: 20) { nodes { topic { name } } }
          defaultBranchRef { name }
          homepageUrl
          visibility
          readme: object(expression: "HEAD:README.md") {
            ... on Blob {
              text
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
   * Fetch comprehensive repository data in a single GraphQL query
   * This replaces multiple REST API calls (repo info, topics, issues, PRs, workflows, etc.)
   *
   * @param owner Repository owner/organization name
   * @param name Repository name
   */
  async getRepositoryDataExtra(owner: string, name: string) {
    const query = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          name
          nameWithOwner
          topics: repositoryTopics(first: 20) { nodes { topic { name } } }
          readme: object(expression: "HEAD:README.md") {
            ... on Blob {
              text
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

  async getUserData(
    username: string,
    additionalDataSize: number = 30
  ): Promise<any | GitHubRequestorError> {
    // Use GraphQL to fetch user data more efficiently
    const query = `
        fragment RepoFields on Repository {
          id
          name
          nameWithOwner
          url
          description
          stargazerCount
          forkCount
          isPrivate
          isFork
          isArchived
          isDisabled
          primaryLanguage { name color }
          licenseInfo { key name spdxId url }
          diskUsage
          createdAt
          updatedAt
          pushedAt
          owner { login url avatarUrl }
          watchers { totalCount }
          issues(states: [OPEN] ){ totalCount }
          pullRequests(states: [OPEN]){ totalCount }
          topics: repositoryTopics(first: ${additionalDataSize}) { nodes { topic { name } } }
          readme: object(expression: "HEAD:README.md") {
            ... on Blob {
              text
            }
          }
        }
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
        query($username: String!) {
          user(login: $username) {
            login
            id
            name
            company
            bio
            location
            email
            websiteUrl
            avatarUrl
            url
            twitterUsername
            followers { totalCount }
            following { totalCount }
            createdAt
            updatedAt
            isHireable
            isDeveloperProgramMember
            isCampusExpert
            isSiteAdmin
            repositoriesContributedTo(first: ${additionalDataSize}, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST]) {
              totalCount
              nodes { ...RepoFields }
            }
            repositories(first: ${additionalDataSize}, orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount
              nodes { ...RepoFields }
            }
            starredRepositories(first:  ${additionalDataSize}, orderBy: {field: STARRED_AT, direction: DESC}) {
              totalCount
              nodes { ...RepoFields }
            }
            issues(first:  ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
              totalCount
              nodes { ...IssueFields }
            }
            pullRequests(first:  ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
              totalCount
              nodes { ...PRFields }
            }
            organizations(first:  ${additionalDataSize}) {
              totalCount
              nodes { login name }
            }
          }
        }
      `;
    try {
      // Attempt GraphQL request
      const graphqlResult = (await this.octokit.graphql(query, {
        username,
      })) as any;
      return graphqlResult;
    } catch (error) {
      console.error(`Error fetching user data via GraphQL: ${error}`);
      return {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'graphql-error',
      };
    }
  }

  async getCommits(
    owner: string,
    name: string,
    branch: string = 'main',
    limit: number = 100
  ): Promise<any> {
    const query = `
        query($owner: String!, $name: String!, $first: Int!) {
          repository(owner: $owner, name: $name) {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: $first) {
                    nodes {
                      oid
                      message
                      committedDate
                      authoredDate
                      pushedDate
                      url
                      author {
                        name
                        email
                        user { login avatarUrl url }
                      }
                      committer {
                        name
                        email
                        user { login avatarUrl url }
                      }
                      parents(first: 10) { nodes { oid } }
                    }
                  }
                }
              }
            }
          }
        }
      `;

    return this.octokit.graphql(query, { owner, name, branch, limit });
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

  async getPullResult(
    owner: string,
    name: string,
    limit: number = 30
  ): Promise<any> {
    const query = `
      query($owner: String!, $name: String!, $first: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequests(states: OPEN, first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                number
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                author { login url avatarUrl }
                labels(first: 10) { nodes { name } }
                assignees(first: 10) { nodes { login url avatarUrl } }
                comments { totalCount }
                merged
                mergedAt
                mergedBy { login url avatarUrl }
              }
            }
          }
        }
      `;
    return this.octokit.graphql(query, {
      owner: org,
      name: repo,
      first: limit,
    });
  }

  async getIssues(
    owner: string,
    name: string,
    state: IssueType = 'open',
    limit: number = 30
  ): Promise<any> {
    const query = `
        query($owner: String!, $name: String!, $states: [IssueState!], $first: Int!) {
          repository(owner: $owner, name: $name) {
            issues(states: $states, first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                number
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                author { login url avatarUrl }
                labels(first: 10) { nodes { name } }
                assignees(first: 10) { nodes { login url avatarUrl } }
                comments { totalCount }
              }
            }
          }
        }
      // `;
    const result = this.octokit.graphql(query, {
      owner: org,
      name: repo,
      states: [state.toUpperCase()],
      first: limit,
    });
  }

  async getRepoTopics(owner: string, name: string): Promise<any> {
    const query = `
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            repositoryTopics(first: 100) {
              nodes {
                topic {
                  name
                }
              }
            }
          }
        }
      `;

    return this.octokit.graphql(query, { owner, name });
  }

  async searchIssuesAndPrs(
    query: string,
    page: number = 1,
    perPage: number = 30,
    sort: string = 'created',
    order: string = 'desc'
  ): Promise<any> {
    const graphqlQuery = `
        query($q: String!, $first: Int!, $after: String) {
          search(query: $q, type: ISSUE, first: $first, after: $after) {
            issueCount
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              ... on Issue {
                id
                number
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                author { login url avatarUrl }
                repository { name owner { login } }
                labels(first: 10) { nodes { name } }
                assignees(first: 10) { nodes { login url avatarUrl } }
                comments { totalCount }
                __typename
              }
              ... on PullRequest {
                id
                number
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                author { login url avatarUrl }
                repository { name owner { login } }
                labels(first: 10) { nodes { name } }
                assignees(first: 10) { nodes { login url avatarUrl } }
                comments { totalCount }
                merged
                mergedAt
                mergedBy { login url avatarUrl }
                __typename
              }
            }
          }
        }
      `;
    // Calculate the GraphQL pagination cursor
    let after: string | null = null;
    let fetched = 0;
    let items: any[] = [];
    let hasNextPage = true;
    let currentPage = 1;

    while (fetched < per_page && hasNextPage && currentPage <= page) {
      // Wait before each request to avoid hitting rate limits
      if (currentPage > 1) await this.wait(this.requestDelayMs);
      const variables = {
        q,
        first: Math.min(per_page, 100),
        after,
      };
      const result = (await this.octokit.graphql(
        graphqlQuery,
        variables
      )) as any;
      const search = result.search;
      hasNextPage = search.pageInfo.hasNextPage;
      after = search.pageInfo.endCursor;
      if (currentPage === page) {
        items = search.nodes;
        break;
      }
      currentPage++;
    }
    return items;
  }
  async searchRepositories(
    q: string = 'org:azure-samples',
    per_page: number = 5,
    sort: RepoSearchSort = 'updated',
    order: RepoSearchOrder = 'desc'
  ): Promise<any> {
    const graphqlQuery = `
        query($q: String!, $first: Int!) {
          search(query: $q, type: REPOSITORY, first: $first) {
            repositoryCount
            nodes {
              ... on Repository {
                id
                name
                nameWithOwner
                owner { login url avatarUrl }
                description
                url
                createdAt
                updatedAt
                pushedAt
                stargazerCount
                forkCount
                isPrivate
                isFork
                isArchived
                isDisabled
                primaryLanguage { name color }
                licenseInfo { key name spdxId url }
                diskUsage
                openIssues: issues(states: OPEN) { totalCount }
                openPRs: pullRequests(states: OPEN) { totalCount }
                watchers { totalCount }
                topics: repositoryTopics(first: 10) { nodes { topic { name } } }
              }
            }
          }
        }
      `;
    const variables = { q, first: per_page };
    console.log(`GraphQL search params: ${JSON.stringify(variables)}`);
    return this.octokit.graphql(graphqlQuery, variables);
  }
}
