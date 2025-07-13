import GitHubApiClient from './api-client.js';
import type {
  ContributorData,
  PrSearchItem,
  ContributorRepo,
} from '../models.js';

export class ContributorService {
  constructor(private api: GitHubApiClient) {}

  async getContributor(username: string): Promise<ContributorData> {
    const octokit = this.api.getRest();
    try {
      const { data: user } = await octokit.rest.users.getByUsername({
        username,
      });
      return {
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatar_url,
        bio: user.bio || '',
        company: user.company || '',
        blog: user.blog || '',
        location: user.location || '',
        twitter: user.twitter_username || '',
        followers: user.followers || 0,
        following: user.following || 0,
        publicRepos: user.public_repos || 0,
        publicGists: user.public_gists || 0,
        repos: [], // Use getContributorRepositories for this
        recentPRs: [], // Use getContributorPRs for this
      };
    } catch (error) {
      console.error(
        `Failed to fetch contributor data for username: ${username}`,
        error
      );
      throw error;
    }
  }

  async getContributorRepositories(
    username: string,
    orgs: string[]
  ): Promise<ContributorRepo[]> {
    const octokit = this.api.getRest();
    const repos: ContributorRepo[] = [];
    for (const org of orgs) {
      try {
        // Search for repos in org where user is a contributor
        const { data } = await octokit.rest.search.repos({
          q: `org:${org} user:${username} fork:true`,
          per_page: 50,
        });
        for (const repo of data.items) {
          repos.push({
            fullName: repo.full_name,
            url: repo.html_url,
            description: repo.description || '',
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            language: repo.language || '',
            lastUpdated: repo.updated_at || '',
          });
        }
        // Also add repos from PRs
        const prQuery = `org:${org} author:${username} is:pr`;
        const prRes = await octokit.rest.search.issuesAndPullRequests({
          q: prQuery,
          per_page: 100,
        });
        const uniquePrRepos = new Map<string, string>();
        for (const pr of prRes.data.items) {
          if (pr.repository_url) {
            const repoFullName = pr.repository_url.replace(
              'https://api.github.com/repos/',
              ''
            );
            if (
              !uniquePrRepos.has(repoFullName) &&
              !repos.some(r => r.fullName === repoFullName)
            ) {
              uniquePrRepos.set(repoFullName, pr.html_url.split('/pull/')[0]);
            }
          }
        }
        for (const [repoFullName, repoUrl] of uniquePrRepos.entries()) {
          const [org, repoName] = repoFullName.split('/');
          try {
            const { data: repoDetails } = await octokit.rest.repos.get({
              owner: org,
              repo: repoName,
            });
            repos.push({
              fullName: repoFullName,
              url: repoUrl,
              description: repoDetails.description || '',
              stars: repoDetails.stargazers_count || 0,
              forks: repoDetails.forks_count || 0,
              language: repoDetails.language || '',
              lastUpdated: repoDetails.updated_at || '',
            });
          } catch (err) {
            console.error(
              `Failed to fetch repo details for ${repoFullName}:`,
              err
            );
            // Ignore errors for missing repos
          }
        }
      } catch (error) {
        console.error(
          `Failed to fetch contributor repositories for org: ${org}, username: ${username}`,
          error
        );
        throw error;
      }
    }
    repos.sort((a, b) => b.stars - a.stars);
    return repos;
  }

  async getContributorPRs(
    username: string,
    orgs: string[],
    sinceDate: string
  ): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();
    const allPRs: PrSearchItem[] = [];
    for (const org of orgs) {
      try {
        const query = `org:${org} author:${username} is:pr created:>=${sinceDate}`;
        const { data } = await octokit.rest.search.issuesAndPullRequests({
          q: query,
          per_page: 50,
        });
        allPRs.push(...data.items);
      } catch (error) {
        console.error(
          `Failed to fetch PRs for org: ${org}, username: ${username}, since: ${sinceDate}`,
          error
        );
        throw error;
      }
    }
    allPRs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return allPRs;
  }

  // GraphQL versions with fragments for full data
  async getContributorGraphql(
    username: string,
    additionalDataSize: number = 30
  ): Promise<ContributorData> {
    try {
      const graphql = this.api.getGraphql();
      // Calculate the date 7 days ago in ISO format
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const query = `
        query($username: String!, $since: DateTime!) {
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
            organizations(first:  ${additionalDataSize}) {
              totalCount
              nodes { login name }
            }
          }
        }
      `;
      const result = await graphql.graphql(query, {
        username,
        since: sevenDaysAgo,
      });
      const user = (result as Record<string, unknown>).user as any;
      return {
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatarUrl,
        bio: user.bio || '',
        company: user.company || '',
        blog: user.websiteUrl || '',
        location: user.location || '',
        twitter: user.twitterUsername || '',
        followers: user.followers.totalCount || 0,
        following: user.following.totalCount || 0,
        publicRepos: 0,
        publicGists: 0, // Not available in this query
        repos: [],
        recentPRs: user.pullRequests.nodes || [],
      };
    } catch (error) {
      console.error('getContributorGraphql failed:', error);
      throw error;
    }
  }

  async getContributorRepositoriesGraphql(
    username: string,
    orgs: string[]
  ): Promise<ContributorRepo[]> {
    const graphql = this.api.getGraphql();
    const repos: ContributorRepo[] = [];
    await Promise.all(
      orgs.map(async org => {
        const query = `
        query($org: String!, $login: String!) {
          organization(login: $org) {
            repositories(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
              nodes {
                nameWithOwner
                url
                description
                stargazerCount
                forkCount
                isPrivate
                isFork
                isArchived
                isDisabled
                primaryLanguage { name }
                licenseInfo { name }
                diskUsage
                createdAt
                updatedAt
                pushedAt
                owner { login }
                watchers { totalCount }
                issues { totalCount }
                pullRequests { totalCount }
                topics: repositoryTopics(first: 10) { nodes { topic { name } } }
                readme: object(expression: "HEAD:README.md") { ... on Blob { text } }
              }
            }
          }
        }
      `;
        const result = await graphql.graphql(query, { org, login: username });
        type RepoNode = {
          nameWithOwner: string;
          url: string;
          description?: string;
          stargazerCount?: number;
          forkCount?: number;
          isPrivate?: boolean;
          isFork?: boolean;
          isArchived?: boolean;
          isDisabled?: boolean;
          primaryLanguage?: { name?: string };
          licenseInfo?: { name?: string };
          diskUsage?: number;
          createdAt?: string;
          updatedAt?: string;
          pushedAt?: string;
          owner?: { login?: string };
          watchers?: { totalCount?: number };
          issues?: { totalCount?: number };
          pullRequests?: { totalCount?: number };
          topics?: { nodes?: { topic?: { name?: string } }[] };
          readme?: { text?: string };
        };
        type GraphqlOrgResult = {
          organization?: { repositories?: { nodes?: RepoNode[] } };
        };
        const organization = (result as GraphqlOrgResult).organization;
        if (
          organization &&
          organization.repositories &&
          organization.repositories.nodes
        ) {
          for (const repo of organization.repositories.nodes) {
            repos.push({
              nameWithOwner: repo.nameWithOwner,
              url: repo.url,
              description: repo.description || '',
              stargazerCount: repo.stargazerCount ?? 0,
              forkCount: repo.forkCount ?? 0,
              isPrivate: repo.isPrivate ?? false,
              isFork: repo.isFork ?? false,
              isArchived: repo.isArchived ?? false,
              isDisabled: repo.isDisabled ?? false,
              primaryLanguage: { name: repo.primaryLanguage?.name ?? null },
              licenseInfo: { name: repo.licenseInfo?.name ?? null },
              diskUsage: repo.diskUsage ?? 0,
              createdAt: repo.createdAt ?? '',
              updatedAt: repo.updatedAt ?? '',
              pushedAt: repo.pushedAt ?? '',
              owner: { login: repo.owner?.login ?? '' },
              watchers: { totalCount: repo.watchers?.totalCount ?? 0 },
              issues: { totalCount: repo.issues?.totalCount ?? 0 },
              pullRequests: { totalCount: repo.pullRequests?.totalCount ?? 0 },
              topics: {
                nodes:
                  repo.topics?.nodes?.map(t => ({
                    name: t.topic?.name ?? '',
                  })) ?? [],
              },
              readme: { text: repo.readme?.text ?? null },
              fullName: repo.nameWithOwner,
              stars: repo.stargazerCount ?? 0,
              forks: repo.forkCount ?? 0,
              language: repo.primaryLanguage?.name || '',
              lastUpdated: repo.updatedAt ?? '',
            });
          }
        }
      })
    );
    return repos;
  }

  async getContributorPRsGraphql(
    username: string,
    orgs: string[],
    sinceDate: string
  ): Promise<PrSearchItem[]> {
    const graphql = this.api.getGraphql();
    const allPRs: PrSearchItem[] = [];
    await Promise.all(
      orgs.map(async org => {
        const query = `
        query($org: String!, $login: String!, $since: DateTime!) {
          search(query: "org:$org author:$login is:pr created:>=$since", type: ISSUE, first: 50) {
            nodes {
              ... on PullRequest {
                id
                number
                title
                url
                createdAt
                updatedAt
                closedAt
                mergedAt
                merged
                state
                repository { nameWithOwner url }
              }
            }
          }
        }
      `;
        const result = await graphql.graphql(query, {
          org,
          login: username,
          since: sinceDate,
        });
        type SearchResult = { search?: { nodes?: PrSearchItem[] } };
        const search = (result as SearchResult).search;
        if (search && search.nodes) {
          allPRs.push(...search.nodes);
        }
      })
    );
    return allPRs;
  }

  async getActiveUserRepositories(
    username: string
  ): Promise<{ id: number; owner: string; name: string }[]> {
    const octokit = this.api.getRest();
    const repos: { id: number; owner: string; name: string }[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await octokit.rest.repos.listForUser({
        username,
        per_page: 100,
        page,
      });

      const filtered = data
        .filter(repo => !repo.archived && !repo.disabled)
        .map(repo => ({
          id: repo.id,
          owner: repo.owner.login,
          name: repo.name,
        }));

      repos.push(...filtered);

      hasMore = data.length === 100;
      page += 1;
    }

    return repos;
  }
  async isActiveRepository(org: string, repo: string): Promise<boolean> {
    const octokit = this.api.getRest();
    try {
      const { data } = await octokit.rest.repos.get({
        owner: org,
        repo,
      });
      return !data.archived && !data.disabled;
    } catch {
      // Optionally handle not found or permission errors
      return false;
    }
  }
}

export default ContributorService;
