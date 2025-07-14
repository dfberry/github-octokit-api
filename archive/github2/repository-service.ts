import GitHubApiClient from './api-client.js';
import type { GitHubRepository } from '../models.js';

export class RepositoryService {
  constructor(private api: GitHubApiClient) {}

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data;
  }

  async getRepositoryGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<GitHubRepoModified | null> {
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
      return repository as GitHubRepoModified;
    } catch (error) {
      console.error('Error fetching repository data:', error);
      //throw error; // Re-throw the error for further handling
      return null;
    }
  }
}

// Type representing the result of the GraphQL query in getRepositoryGraphql
export type GitHubRepoModified = {
  id: string;
  name: string;
  nameWithOwner: string;
  url: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isDisabled: boolean;
  primaryLanguage: { name: string } | null;
  licenseInfo: { name: string } | null;
  diskUsage: number | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  owner: { login: string };
  watchers: { totalCount: number };
  topics: { nodes: { topic: { name: string } }[] };
  readme: { text: string } | null;
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
};

export default RepositoryService;
