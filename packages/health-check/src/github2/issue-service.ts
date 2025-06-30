import GitHubApiClient from './api-client.js';
import type { PrSearchItem } from '../models.js';

export class IssueService {
  constructor(private api: GitHubApiClient) {}

  async getIssues(owner: string, repo: string): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    });
    return data as PrSearchItem[];
  }

  async getIssuesGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<PrSearchItem[]> {
    const graphql = this.api.getGraphql();
    const query = `
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
    const issues =
      (result as Record<string, any>).repository?.issues?.nodes || [];
    return issues as PrSearchItem[];
  }
}

export default IssueService;
