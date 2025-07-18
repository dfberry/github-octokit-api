import GitHubApiClient from './api-client.js';
import type { PrSearchItem } from '../models.js';

export class PullRequestService {
  constructor(private api: GitHubApiClient) {}

  async getPullRequests(owner: string, repo: string): Promise<PrSearchItem[]> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: 100,
    });
    // Octokit returns PullRequest[], but for compatibility, cast to PrSearchItem[]
    return data as unknown as PrSearchItem[];
  }

  async getPullRequestsGraphql(
    owner: string,
    repo: string,
    additionalDataSize: number = 30
  ): Promise<PrSearchItem[]> {
    const graphql = this.api.getGraphql();
    const query = `
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
          pullRequests(first: ${additionalDataSize}, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { ...PRFields }
          }
        }
      }
    `;
    const result = await graphql.graphql(query, { owner, repo });
    const pullRequests =
      (result as Record<string, any>).repository?.pullRequests?.nodes || [];
    return pullRequests as PrSearchItem[];
  }
}

export default PullRequestService;
