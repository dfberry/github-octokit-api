import GitHubApiClient from './api-client.js';
import type { Repository } from '../models.js';

export class RepositoryService {
  constructor(private api: GitHubApiClient) {}

  async getRepository(owner: string, repo: string): Promise<Repository> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data;
  }

  async getRepositoryGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<Repository> {
    const graphql = this.api.getGraphql();
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
        issues(states: [OPEN]){ totalCount }
        pullRequests(states: [OPEN]){ totalCount }
        topics: repositoryTopics(first: ${additionalDataSize}) { nodes { topic { name } } }
        readme: object(expression: "HEAD:README.md") { ... on Blob { text } }
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
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          ...RepoFields
          issues(first: ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { ...IssueFields }
          }
          pullRequests(first: ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { ...PRFields }
          }
        }
      }
    `;
    const result = await graphql.graphql(query, { owner, repo });
    const repository = (result as Record<string, unknown>).repository;
    return repository as Repository;
  }
}

export default RepositoryService;
