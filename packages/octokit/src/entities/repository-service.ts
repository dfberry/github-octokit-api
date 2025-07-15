import { GitHubApiClient } from './client.js';
import type { GitHubRepoFromGraphQlModified } from './models.js';

export class RepositoryService {
  constructor(private api: GitHubApiClient) {}

  async getRepositoryGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<GitHubRepoFromGraphQlModified | null> {
    try {
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
        primaryLanguage { name }
        licenseInfo { name }
        diskUsage
        createdAt
        updatedAt
        pushedAt
        owner { login }
        watchers { totalCount }
        topics: repositoryTopics(first: ${additionalDataSize}) { nodes { topic { name } } }
        readme: object(expression: "HEAD:README.md") { ... on Blob { text } }
      }
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          ...RepoFields
          issues(states: OPEN) {
            totalCount
          }
          pullRequests(states: OPEN) {
            totalCount
          }
        }
      }
    `;
      const result = await graphql.graphql(query, { owner, repo });
      const repository = (result as Record<string, unknown>).repository;
      return repository as GitHubRepoFromGraphQlModified;
    } catch (error) {
      console.error('Error fetching repository data:', error);
      return null;
    }
  }
}
