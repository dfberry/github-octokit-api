import { Octokit } from 'octokit';

import {
  Commit,
  DependabotAlert,
  Issue,
  IssueType,
  PullRequest,
  RepoSearchOrder,
  PRSearchSort,
  RepoSearchSort,
  Repository,
  SearchRepositoryItem,
  Workflow,
  PrSearchItem,
  SimpleRepositoryError,
  // Import the new types
  WorkflowRun,
  RepoSecret,
  OrgSecret,
  SelfHostedRunner,
  GitHubRequestorError,
} from '../models.js';
import { AuthorAssociation } from './author-association-type.js';

// Alias for workflows response type that we didn't export from models.ts

// Alias for workflows response type that we didn't export from models.ts
export function isRepositoryError(obj: any): obj is SimpleRepositoryError {
  return (
    obj &&
    typeof obj === 'object' &&
    'error' in obj &&
    'found' in obj &&
    obj.found === false
  );
}

export function isGitHubRequestorError(obj: any): obj is GitHubRequestorError {
  return (
    obj &&
    typeof obj === 'object' &&
    'functionName' in obj &&
    'errorMessage' in obj &&
    'timestamp' in obj
  );
}

export default class GitHubRequestor {
  private octokit: Octokit;
  private requestDelayMs: number;

  constructor(token: string, requestDelayMs: number = 1000) {
    console.log(`Initializing GitHubRequestor with token: ${token}`);
    this.octokit = new Octokit({ auth: token });
    this.requestDelayMs = requestDelayMs;
  }

  /**
   * Wait for a specified number of milliseconds
   */
  private async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper method to create standardized error objects
   */
  private createError(
    functionName: string,
    error: any,
    requestParams?: Record<string, any>
  ): GitHubRequestorError {
    let errorCode: number | undefined;
    let errorMessage: string;

    if (error.status) {
      errorCode = error.status;
      errorMessage = error.message || 'Unknown error';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    return {
      functionName,
      errorCode,
      errorMessage,
      timestamp: new Date(),
      request: requestParams,
    };
  }

  async getRepo(
    org: string,
    repo: string
  ): Promise<Repository | GitHubRequestorError> {
    try {
      console.log(`Fetching repository data for ${org}/${repo} (GraphQL)`);
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
            topics: repositoryTopics(first: 10) { nodes { topic { name } } }
            defaultBranchRef { name }
            homepageUrl
            visibility
          }
        }
      `;
      const variables = { owner: org, name: repo };
      const result = (await this.octokit.graphql(query, variables)) as any;
      const r = result.repository;
      if (!r) throw new Error('Repository not found');
      // Map only the properties that exist on the Repository (OctokitRepo) type
      const mapped: Partial<Repository> = {
        id: r.id,
        node_id: r.id,
        name: r.name,
        full_name: r.nameWithOwner,
        private: r.isPrivate,
        owner: {
          login: r.owner.login,
          id: 0,
          node_id: '',
          avatar_url: r.owner.avatarUrl,
          gravatar_id: null,
          url: r.owner.url,
          html_url: r.owner.url,
          followers_url: '',
          following_url: '',
          gists_url: '',
          starred_url: '',
          subscriptions_url: '',
          organizations_url: '',
          repos_url: '',
          events_url: '',
          received_events_url: '',
          type: 'User',
          site_admin: false,
        },
        html_url: r.url,
        description: r.description,
        fork: r.isFork,
        url: r.url,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        pushed_at: r.pushedAt,
        homepage: r.homepageUrl,
        size: r.diskUsage,
        stargazers_count: r.stargazerCount,
        watchers_count: r.watchers.totalCount,
        language: r.primaryLanguage ? r.primaryLanguage.name : null,
        forks_count: r.forkCount,
        open_issues_count: r.openIssues.totalCount,
        license: r.licenseInfo
          ? {
              key: r.licenseInfo.key,
              name: r.licenseInfo.name,
              spdx_id: r.licenseInfo.spdxId,
              url: r.licenseInfo.url,
              node_id: '',
            }
          : null,
        topics: r.topics.nodes.map((n: any) => n.topic.name),
        archived: r.isArchived,
        disabled: r.isDisabled,
        visibility: r.visibility
          ? r.visibility.toLowerCase()
          : r.isPrivate
            ? 'private'
            : 'public',
        default_branch: r.defaultBranchRef ? r.defaultBranchRef.name : null,
      };
      return mapped as Repository;
    } catch (error) {
      console.error(`Error fetching repository data (GraphQL): ${error}`);
      return this.createError('getRepo', error, { org, repo });
    }
  }

  /**
   * Get contents of a repository at a specific path
   * @param org Repository owner
   * @param repo Repository name
   * @param path Path to get contents from (root = '')
   * @returns Array of content items or a single content item
   */
  async getRepoContents(
    org: string,
    repo: string,
    path: string
  ): Promise<any[] | any | GitHubRequestorError> {
    try {
      console.log(`Fetching contents at path "${path}" for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.getContent({
        owner: org,
        repo: repo,
        path: path,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching repository contents at "${path}": ${error}`
      );
      return this.createError('getRepoContents', error, { org, repo, path });
    }
  }

  async getSearchRepository(
    q: string = 'org:azure-samples',
    per_page: number = 5,
    sort: RepoSearchSort = 'updated',
    order: RepoSearchOrder = 'desc'
  ): Promise<SearchRepositoryItem[] | GitHubRequestorError> {
    try {
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
      const result = (await this.octokit.graphql(
        graphqlQuery,
        variables
      )) as any;
      const items = (result.search.nodes || []).map((repo: any) => ({
        id: repo.id,
        node_id: repo.id,
        name: repo.name,
        full_name: repo.nameWithOwner,
        private: repo.isPrivate,
        owner: {
          login: repo.owner.login,
          id: 0,
          node_id: '',
          avatar_url: repo.owner.avatarUrl,
          gravatar_id: null,
          url: repo.owner.url,
          html_url: repo.owner.url,
          followers_url: '',
          following_url: '',
          gists_url: '',
          starred_url: '',
          subscriptions_url: '',
          organizations_url: '',
          repos_url: '',
          events_url: '',
          received_events_url: '',
          type: 'User',
          site_admin: false,
        },
        html_url: repo.url,
        description: repo.description,
        fork: repo.isFork,
        url: repo.url,
        created_at: repo.createdAt,
        updated_at: repo.updatedAt,
        pushed_at: repo.pushedAt,
        homepage: null,
        size: repo.diskUsage,
        stargazers_count: repo.stargazerCount,
        watchers_count: repo.watchers.totalCount,
        language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
        forks_count: repo.forkCount,
        open_issues_count: repo.openIssues.totalCount,
        license: repo.licenseInfo
          ? {
              key: repo.licenseInfo.key,
              name: repo.licenseInfo.name,
              spdx_id: repo.licenseInfo.spdxId,
              url: repo.licenseInfo.url,
              node_id: '',
            }
          : null,
        topics: repo.topics.nodes.map((n: any) => n.topic.name),
        archived: repo.isArchived,
        disabled: repo.isDisabled,
        visibility: repo.isPrivate ? 'private' : 'public',
        default_branch: null,
        // Not available in GraphQL, set to 1
      }));
      console.log(`Found ${items.length} repositories (GraphQL)`);
      return items;
    } catch (error) {
      console.error(`Error search repository (GraphQL): ${error}`);
      return this.createError('getSearchRepository', error, {
        q,
        per_page,
        sort,
        order,
      });
    }
  }

  async searchIssuesAndPrs(
    q: string,
    page: number = 1,
    per_page: number = 5,
    sort: PRSearchSort = 'created',
    order: RepoSearchOrder = 'desc'
  ): Promise<PrSearchItem[] | GitHubRequestorError> {
    await this.wait(this.requestDelayMs);
    try {
      console.log(`Searching issues and PRs for query: ${q} (GraphQL)`);

      // GraphQL query for searching issues and PRs
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

      // Map GraphQL nodes to REST API shape (PrSearchItem)
      const mappedItems = items.map((item: any) => {
        const isPR = item.__typename === 'PullRequest';
        // The REST API returns many more fields, but we must at least provide all required ones
        // See: https://docs.github.com/en/rest/reference/search#search-issues-and-pull-requests
        // For user, fill all required fields with null/defaults if not available
        const user = item.author
          ? {
              login: item.author.login,
              id: 0, // Not available in GraphQL
              node_id: '',
              avatar_url: item.author.avatarUrl,
              gravatar_id: null,
              url: item.author.url,
              html_url: item.author.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null;
        return {
          url: item.url,
          repository_url: `https://github.com/${item.repository.owner.login}/${item.repository.name}`,
          labels_url: `${item.url}/labels{/name}`,
          comments_url: `${item.url}/comments`,
          events_url: `${item.url}/events`,
          html_url: item.url,
          id: typeof item.id === 'number' ? item.id : 0,
          node_id: typeof item.id === 'string' ? item.id : '',
          number: item.number,
          title: item.title,
          user,
          labels: item.labels.nodes.map((l: any) => ({ name: l.name })),
          state: item.state,
          locked: false, // Not available in GraphQL, default to false
          assignee: null, // Not available in GraphQL, set to null
          assignees: item.assignees.nodes.map((a: any) => ({
            login: a.login,
            id: 0,
            node_id: '',
            avatar_url: a.avatarUrl,
            gravatar_id: null,
            url: a.url,
            html_url: a.url,
            followers_url: '',
            following_url: '',
            gists_url: '',
            starred_url: '',
            subscriptions_url: '',
            organizations_url: '',
            repos_url: '',
            events_url: '',
            received_events_url: '',
            type: 'User',
            site_admin: false,
            name: null,
            company: null,
            blog: null,
            location: null,
            email: null,
            hireable: null,
            bio: null,
            twitter_username: null,
            public_repos: null,
            public_gists: null,
            followers: null,
            following: null,
            created_at: null,
            updated_at: null,
            user_view_type: undefined,
          })),
          milestone: null, // Not available in GraphQL, set to null
          comments: item.comments.totalCount,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          closed_at: item.closedAt,
          author_association: 'NONE' as AuthorAssociation, // Set to a valid string from the union
          active_lock_reason: null, // Not available in GraphQL, set to null
          pull_request: isPR
            ? {
                url: `https://api.github.com/repos/${item.repository.owner.login}/${item.repository.name}/pulls/${item.number}`,
                html_url: `https://github.com/${item.repository.owner.login}/${item.repository.name}/pull/${item.number}`,
                diff_url: null, // Not available from GraphQL
                patch_url: null, // Not available from GraphQL
                merged: item.merged,
                merged_at: item.mergedAt,
                merged_by: item.mergedBy
                  ? {
                      login: item.mergedBy.login,
                      id: 0,
                      node_id: '',
                      avatar_url: item.mergedBy.avatarUrl,
                      gravatar_id: null,
                      url: item.mergedBy.url,
                      html_url: item.mergedBy.url,
                      followers_url: '',
                      following_url: '',
                      gists_url: '',
                      starred_url: '',
                      subscriptions_url: '',
                      organizations_url: '',
                      repos_url: '',
                      events_url: '',
                      received_events_url: '',
                      type: 'User',
                      site_admin: false,
                      name: null,
                      company: null,
                      blog: null,
                      location: null,
                      email: null,
                      hireable: null,
                      bio: null,
                      twitter_username: null,
                      public_repos: null,
                      public_gists: null,
                      followers: null,
                      following: null,
                      created_at: null,
                      updated_at: null,
                      user_view_type: undefined,
                    }
                  : null,
              }
            : undefined,
          body: item.body,
          score: 1, // Not available in GraphQL, set to 1
          // Add __typename for possible downstream logic
          __typename: item.__typename,
        };
      });

      console.log(`Found ${mappedItems.length} issues and PRs (GraphQL)`);
      return mappedItems;
    } catch (error) {
      console.error(`Error searching issues and PRs (GraphQL): ${error}`);
      return this.createError('searchIssuesAndPRs', error, {
        q,
        page,
        per_page,
        sort,
        order,
      });
    }
  }

  async getRepoTopics(
    org: string,
    repo: string
  ): Promise<string[] | GitHubRequestorError> {
    try {
      console.log(`Fetching repository topics for ${org}/${repo} (GraphQL)`);
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
      const variables = { owner: org, name: repo };
      const result = (await this.octokit.graphql(query, variables)) as any;
      const topics =
        result?.repository?.repositoryTopics?.nodes?.map(
          (n: any) => n.topic.name
        ) || [];
      return topics;
    } catch (error) {
      console.error(`Error fetching repository topics (GraphQL): ${error}`);
      return this.createError('getRepoTopics', error, { org, repo });
    }
  }

  // state: "open" | "closed" | "all"
  async getIssues(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<Issue[] | GitHubRequestorError> {
    await this.wait(this.requestDelayMs);
    try {
      // Wait before making the request to avoid hitting rate limits
      await this.wait(this.requestDelayMs);
      console.log(`Fetching issues for ${org}/${repo} (GraphQL)`);
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
      `;
      const variables = {
        owner: org,
        name: repo,
        states: [state.toUpperCase()],
        first: limit,
      };
      const result = (await this.octokit.graphql(query, variables)) as any;
      const nodes = result?.repository?.issues?.nodes || [];
      // Map GraphQL nodes to REST API Issue shape
      const issues = nodes.map((item: any) => ({
        url: item.url,
        repository_url: `https://github.com/${org}/${repo}`,
        labels_url: `${item.url}/labels{/name}`,
        comments_url: `${item.url}/comments`,
        events_url: `${item.url}/events`,
        html_url: item.url,
        id: typeof item.id === 'number' ? item.id : 0,
        node_id: typeof item.id === 'string' ? item.id : '',
        number: item.number,
        title: item.title,
        user: item.author
          ? {
              login: item.author.login,
              id: 0,
              node_id: '',
              avatar_url: item.author.avatarUrl,
              gravatar_id: null,
              url: item.author.url,
              html_url: item.author.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null,
        labels: item.labels.nodes.map((l: any) => ({ name: l.name })),
        state: item.state,
        locked: false, // Not available in GraphQL, default to false
        assignee: null, // Not available in GraphQL, set to null
        assignees: item.assignees.nodes.map((a: any) => ({
          login: a.login,
          id: 0,
          node_id: '',
          avatar_url: a.avatarUrl,
          gravatar_id: null,
          url: a.url,
          html_url: a.url,
          followers_url: '',
          following_url: '',
          gists_url: '',
          starred_url: '',
          subscriptions_url: '',
          organizations_url: '',
          repos_url: '',
          events_url: '',
          received_events_url: '',
          type: 'User',
          site_admin: false,
          name: null,
          company: null,
          blog: null,
          location: null,
          email: null,
          hireable: null,
          bio: null,
          twitter_username: null,
          public_repos: null,
          public_gists: null,
          followers: null,
          following: null,
          created_at: null,
          updated_at: null,
          user_view_type: undefined,
        })),
        milestone: null, // Not available in GraphQL, set to null
        comments: item.comments.totalCount,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        closed_at: item.closedAt,
        author_association: 'NONE', // Not available in GraphQL, set to 'NONE'
        active_lock_reason: null, // Not available in GraphQL, set to null
        pull_request: undefined, // Not a PR
        body: item.body,
        score: 1, // Not available in GraphQL, set to 1
      }));
      return issues;
    } catch (error) {
      console.error(`Error fetching issues (GraphQL): ${error}`);
      return this.createError('getIssues', error, { org, repo, state, limit });
    }
  }

  async getPullRequests(
    org: string,
    repo: string,
    limit = 1
  ): Promise<PullRequest[] | GitHubRequestorError> {
    await this.wait(this.requestDelayMs);
    try {
      // Wait before making the request to avoid hitting rate limits
      await this.wait(this.requestDelayMs);
      console.log(`Fetching pull requests for ${org}/${repo} (GraphQL)`);
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
      const variables = {
        owner: org,
        name: repo,
        first: limit,
      };
      const result = (await this.octokit.graphql(query, variables)) as any;
      const nodes = result?.repository?.pullRequests?.nodes || [];
      // Map GraphQL nodes to REST API PullRequest shape
      const pullRequests = nodes.map((item: any) => ({
        url: item.url,
        id: typeof item.id === 'number' ? item.id : 0,
        node_id: typeof item.id === 'string' ? item.id : '',
        html_url: item.url,
        diff_url: null, // Not available from GraphQL
        patch_url: null, // Not available from GraphQL
        issue_url: null, // Not available from GraphQL
        number: item.number,
        state: item.state,
        locked: false, // Not available in GraphQL, default to false
        title: item.title,
        user: item.author
          ? {
              login: item.author.login,
              id: 0,
              node_id: '',
              avatar_url: item.author.avatarUrl,
              gravatar_id: null,
              url: item.author.url,
              html_url: item.author.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null,
        body: item.body,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        closed_at: item.closedAt,
        merged_at: item.mergedAt,
        merge_commit_sha: null, // Not available in GraphQL
        assignee: null, // Not available in GraphQL, set to null
        assignees: item.assignees.nodes.map((a: any) => ({
          login: a.login,
          id: 0,
          node_id: '',
          avatar_url: a.avatarUrl,
          gravatar_id: null,
          url: a.url,
          html_url: a.url,
          followers_url: '',
          following_url: '',
          gists_url: '',
          starred_url: '',
          subscriptions_url: '',
          organizations_url: '',
          repos_url: '',
          events_url: '',
          received_events_url: '',
          type: 'User',
          site_admin: false,
          name: null,
          company: null,
          blog: null,
          location: null,
          email: null,
          hireable: null,
          bio: null,
          twitter_username: null,
          public_repos: null,
          public_gists: null,
          followers: null,
          following: null,
          created_at: null,
          updated_at: null,
          user_view_type: undefined,
        })),
        requested_reviewers: [], // Not available in GraphQL, set to empty array
        labels: item.labels.nodes.map((l: any) => ({ name: l.name })),
        milestone: null, // Not available in GraphQL, set to null
        draft: false, // Not available in GraphQL, set to false
        commits_url: null, // Not available in GraphQL
        review_comments_url: null, // Not available in GraphQL
        review_comment_url: null, // Not available in GraphQL
        comments_url: `${item.url}/comments`,
        statuses_url: null, // Not available in GraphQL
        head: null, // Not available in GraphQL
        base: null, // Not available in GraphQL
        _links: {}, // Not available in GraphQL
        author_association: 'NONE', // Not available in GraphQL, set to 'NONE'
        auto_merge: null, // Not available in GraphQL
        active_lock_reason: null, // Not available in GraphQL
        merged: item.merged,
        merged_by: item.mergedBy
          ? {
              login: item.mergedBy.login,
              id: 0,
              node_id: '',
              avatar_url: item.mergedBy.avatarUrl,
              gravatar_id: null,
              url: item.mergedBy.url,
              html_url: item.mergedBy.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null,
        comments: item.comments.totalCount,
        review_comments: 0, // Not available in GraphQL
        maintainer_can_modify: false, // Not available in GraphQL
        rebaseable: false, // Not available in GraphQL
        mergeable: null, // Not available in GraphQL
        mergeable_state: null, // Not available in GraphQL
      }));
      return pullRequests;
    } catch (error) {
      console.error(`Error fetching pull requests (GraphQL): ${error}`);
      return this.createError('getPullRequests', error, { org, repo, limit });
    }
  }

  async getCommits(
    org: string,
    repo: string,
    limit = 1
  ): Promise<Commit[] | GitHubRequestorError> {
    await this.wait(this.requestDelayMs);
    try {
      // Wait before making the request to avoid hitting rate limits
      await this.wait(this.requestDelayMs);
      console.log(`Fetching commits for ${org}/${repo} (GraphQL)`);
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
      const variables = { owner: org, name: repo, first: limit };
      const result = (await this.octokit.graphql(query, variables)) as any;
      const nodes =
        result?.repository?.defaultBranchRef?.target?.history?.nodes || [];
      // Map GraphQL nodes to REST API Commit shape
      const commits = nodes.map((item: any) => ({
        sha: item.oid,
        node_id: '',
        commit: {
          author: {
            name: item.author?.name || null,
            email: item.author?.email || null,
            date: item.authoredDate,
          },
          committer: {
            name: item.committer?.name || null,
            email: item.committer?.email || null,
            date: item.committedDate,
          },
          message: item.message,
          url: item.url,
          comment_count: 0, // Not available in GraphQL
          verification: null, // Not available in GraphQL
        },
        url: item.url,
        html_url: item.url,
        comments_url: '',
        author: item.author?.user
          ? {
              login: item.author.user.login,
              id: 0,
              node_id: '',
              avatar_url: item.author.user.avatarUrl,
              gravatar_id: null,
              url: item.author.user.url,
              html_url: item.author.user.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null,
        committer: item.committer?.user
          ? {
              login: item.committer.user.login,
              id: 0,
              node_id: '',
              avatar_url: item.committer.user.avatarUrl,
              gravatar_id: null,
              url: item.committer.user.url,
              html_url: item.committer.user.url,
              followers_url: '',
              following_url: '',
              gists_url: '',
              starred_url: '',
              subscriptions_url: '',
              organizations_url: '',
              repos_url: '',
              events_url: '',
              received_events_url: '',
              type: 'User',
              site_admin: false,
              name: null,
              company: null,
              blog: null,
              location: null,
              email: null,
              hireable: null,
              bio: null,
              twitter_username: null,
              public_repos: null,
              public_gists: null,
              followers: null,
              following: null,
              created_at: null,
              updated_at: null,
              user_view_type: undefined,
            }
          : null,
        parents: item.parents.nodes.map((p: any) => ({
          sha: p.oid,
          url: '',
          html_url: '',
        })),
        stats: null, // Not available in GraphQL
        files: null, // Not available in GraphQL
      }));
      return commits;
    } catch (error) {
      console.error(`Error fetching commits (GraphQL): ${error}`);
      return this.createError('getCommits', error, { org, repo, limit });
    }
  }

  async getDependabotAlerts(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<DependabotAlert[] | GitHubRequestorError> {
    try {
      console.log(`Fetching dependabot alerts for ${org}/${repo}`);
      const response = await this.octokit.rest.dependabot.listAlertsForRepo({
        owner: org,
        repo: repo,
        per_page: limit,
        state: state,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching dependabot alerts: ${error}`);
      return this.createError('getDependabotAlerts', error, {
        org,
        repo,
        state,
        limit,
      });
    }
  }

  async getRepoWorkflows(
    org: string,
    repo: string
  ): Promise<Workflow[] | GitHubRequestorError> {
    try {
      console.log(`Fetching workflows for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.listRepoWorkflows({
        owner: org,
        repo: repo,
      });
      return response.data.workflows;
    } catch (error) {
      console.error(`Error fetching workflows: ${error}`);
      return this.createError('getRepoWorkflows', error, { org, repo });
    }
  }

  async getWorkflowRun(
    org: string,
    repo: string,
    runId: number
  ): Promise<WorkflowRun | GitHubRequestorError> {
    try {
      console.log(`Fetching workflow run ${runId} for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner: org,
        repo: repo,
        run_id: runId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow run ${runId}: ${error}`);
      return this.createError('getWorkflowRun', error, { org, repo, runId });
    }
  }

  async getWorkflow(
    org: string,
    repo: string,
    workflowId: number | string
  ): Promise<Workflow | GitHubRequestorError> {
    try {
      console.log(`Fetching workflow ${workflowId} for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.getWorkflow({
        owner: org,
        repo: repo,
        workflow_id: workflowId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}: ${error}`);
      return this.createError('getWorkflow', error, { org, repo, workflowId });
    }
  }

  async listRepoSecrets(
    org: string,
    repo: string,
    perPage: number = 100
  ): Promise<RepoSecret[] | GitHubRequestorError> {
    try {
      console.log(`Fetching repository secrets for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.listRepoSecrets({
        owner: org,
        repo: repo,
        per_page: perPage,
      });
      return response.data.secrets;
    } catch (error) {
      console.error(`Error fetching repository secrets: ${error}`);
      return this.createError('listRepoSecrets', error, { org, repo, perPage });
    }
  }

  async listOrgSecrets(
    org: string,
    perPage: number = 100
  ): Promise<OrgSecret[] | GitHubRequestorError> {
    try {
      console.log(`Fetching organization secrets for ${org}`);
      const response = await this.octokit.rest.actions.listOrgSecrets({
        org: org,
        per_page: perPage,
      });
      return response.data.secrets;
    } catch (error) {
      console.error(`Error fetching organization secrets: ${error}`);
      return this.createError('listOrgSecrets', error, { org, perPage });
    }
  }

  async listSelfHostedRunnersForRepo(
    org: string,
    repo: string,
    perPage: number = 100
  ): Promise<SelfHostedRunner[] | GitHubRequestorError> {
    try {
      console.log(`Fetching self-hosted runners for ${org}/${repo}`);
      const response =
        await this.octokit.rest.actions.listSelfHostedRunnersForRepo({
          owner: org,
          repo: repo,
          per_page: perPage,
        });
      return response.data.runners;
    } catch (error) {
      console.error(`Error fetching self-hosted runners: ${error}`);
      return this.createError('listSelfHostedRunnersForRepo', error, {
        org,
        repo,
        perPage,
      });
    }
  }

  async listWorkflowRuns(
    org: string,
    repo: string,
    workflowId: number,
    perPage: number = 1
  ): Promise<WorkflowRun[] | GitHubRequestorError> {
    try {
      console.log(
        `Fetching workflow runs for workflow ${workflowId} in ${org}/${repo}`
      );
      const response = await this.octokit.rest.actions.listWorkflowRuns({
        owner: org,
        repo: repo,
        workflow_id: workflowId,
        per_page: perPage,
      });
      return response.data.workflow_runs;
    } catch (error) {
      console.error(`Error fetching workflow runs: ${error}`);
      return this.createError('listWorkflowRuns', error, {
        org,
        repo,
        workflowId,
        perPage,
      });
    }
  }

  /**
   * Get detailed information about a GitHub user
   * Uses GraphQL when possible for more efficient data fetching, falls back to REST
   * @param username GitHub username
   * @returns User data object or error (in the same shape as REST API)
   */
  async getUserData(username: string): Promise<any | GitHubRequestorError> {
    await this.wait(this.requestDelayMs);
    try {
      // Wait before making the request to avoid hitting rate limits
      await this.wait(this.requestDelayMs);
      console.log(`Fetching user data for ${username} (GraphQL-optimized)`);

      const sizeOfAdditionalData = 30; // Size of additional data to fetch for GraphQL fallback

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
            repositoriesContributedTo(first: ${sizeOfAdditionalData}, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST]) {
              totalCount
              nodes { ...RepoFields }
            }
            repositories(first: ${sizeOfAdditionalData}, orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount
              nodes { ...RepoFields }
            }
            starredRepositories(first:  ${sizeOfAdditionalData}, orderBy: {field: STARRED_AT, direction: DESC}) {
              totalCount
              nodes { ...RepoFields }
            }
            issues(first:  ${sizeOfAdditionalData}, orderBy: {field: CREATED_AT, direction: DESC}) {
              totalCount
              nodes { ...IssueFields }
            }
            pullRequests(first:  ${sizeOfAdditionalData}, orderBy: {field: CREATED_AT, direction: DESC}) {
              totalCount
              nodes { ...PRFields }
            }
            organizations(first:  ${sizeOfAdditionalData}) {
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

        if (graphqlResult && graphqlResult.user) {
          // Transform GraphQL response to match REST API shape and include lists
          return {
            login: graphqlResult.user.login,
            id: graphqlResult.user.id,
            name: graphqlResult.user.name,
            company: graphqlResult.user.company,
            blog: graphqlResult.user.websiteUrl,
            location: graphqlResult.user.location,
            email: graphqlResult.user.email,
            hireable: graphqlResult.user.isHireable,
            bio: graphqlResult.user.bio,
            twitter_username: graphqlResult.user.twitterUsername,
            public_repos: graphqlResult.user.repositories.totalCount,
            public_gists: 0, // Not available in basic GraphQL query
            followers: graphqlResult.user.followers.totalCount,
            following: graphqlResult.user.following.totalCount,
            created_at: graphqlResult.user.createdAt,
            updated_at: graphqlResult.user.updatedAt,
            avatar_url: graphqlResult.user.avatarUrl,
            html_url: graphqlResult.user.url,
            site_admin: graphqlResult.user.isSiteAdmin,
            contributed_repositories:
              graphqlResult.user.repositoriesContributedTo.totalCount,
            contributed_repositories_list:
              graphqlResult.user.repositoriesContributedTo.nodes,
            repositories: graphqlResult.user.repositories.totalCount,
            repositories_list: graphqlResult.user.repositories.nodes,
            starred_repositories:
              graphqlResult.user.starredRepositories.totalCount,
            starred_repositories_list:
              graphqlResult.user.starredRepositories.nodes,
            issues: graphqlResult.user.issues.totalCount,
            issues_list: graphqlResult.user.issues.nodes,
            pull_requests: graphqlResult.user.pullRequests.totalCount,
            pull_requests_list: graphqlResult.user.pullRequests.nodes,
            organizations: graphqlResult.user.organizations.nodes.map(
              (org: any) => ({
                login: org.login,
                name: org.name,
              })
            ),
          };
        }
      } catch (graphqlError) {
        console.log(
          `GraphQL request failed, falling back to REST: ${graphqlError instanceof Error ? graphqlError.message : String(graphqlError)}`
        );
        // Silently fall back to REST API - don't return error yet
      }

      // Fall back to REST API if GraphQL failed or returned no user
      console.log(`Fetching user data for ${username} using REST API fallback`);
      const response = await this.octokit.rest.users.getByUsername({
        username: username,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching user data for ${username}: ${error}`);
      return this.createError('getUserData', error, { username });
    }
  }

  /**
   * Get authenticated user information
   * @returns User information object or error
   */
  async getAuthenticatedUser() {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return data;
    } catch (error) {
      return this.createError('getAuthenticatedUser', error);
    }
  }

  /**
   * Test authentication with GitHub API
   * @returns Object containing auth status and details
   * @private Only used by performAuthTest
   */
  async testAuth(): Promise<{
    success: boolean;
    message: string;
    scopes?: string[];
    rateLimit?: { limit: number; remaining: number; reset: Date };
  }> {
    try {
      // Get rate limit info and response headers for scope info
      const response = await this.octokit.rest.rateLimit.get();
      const { limit, remaining, reset } = response.data.rate;

      // Extract scopes from response headers
      const scopesHeader = response.headers['x-oauth-scopes'];
      const scopes = scopesHeader ? scopesHeader.split(', ') : undefined;

      return {
        success: true,
        message: 'Authentication successful',
        scopes,
        rateLimit: {
          limit,
          remaining,
          reset: new Date(reset * 1000),
        },
      };
    } catch (error) {
      let message = 'Authentication failed';
      if (error instanceof Error) {
        // Parse common GitHub API errors
        if (error.message.includes('Bad credentials')) {
          message =
            'Invalid GitHub token. Please check your GITHUB_TOKEN environment variable.';
        } else if (error.message.includes('rate limit')) {
          message =
            'Rate limit exceeded. Please wait or use a different token.';
        } else {
          message = `GitHub API error: ${error.message}`;
        }
      }
      return { success: false, message };
    }
  }
}
