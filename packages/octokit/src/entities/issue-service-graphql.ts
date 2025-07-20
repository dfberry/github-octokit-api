import { GitHubApiClient } from './client.js';
import type {
  GraphQLUserIssuesAndPRs,
  GraphQLIssueNode,
  GraphQLPullRequestNode,
} from './models-graphql.js';
import { getDaysAgo } from '../utils/datetime.js';

export class IssueServiceGraphQL {
  constructor(private api: GitHubApiClient) {}

  /**
   * Fetches all issues and PRs a user has touched (author, assignee, commenter) in the last N days using the GraphQL API.
   * @param username - The GitHub username
   * @param daysAgo - Number of days in the past to include
   */
  async getRecentInvolvedIssues(
    username: string,
    daysAgo: number
  ): Promise<GraphQLUserIssuesAndPRs> {
    const octokit = this.api.getGraphql();
    const sinceDate = getDaysAgo(daysAgo);
    let hasNextPage = true;
    let endCursor: string | null = null;
    const allNodes: (GraphQLIssueNode | GraphQLPullRequestNode)[] = [];

    while (hasNextPage) {
      const query = `
        query($searchQuery: String!, $after: String) {
          search(query: $searchQuery, type: ISSUE, first: 100, after: $after) {
            issueCount
            nodes {
              __typename
              ... on Issue {
                id
                number
                title
                url
                state
                createdAt
                updatedAt
                closedAt
                author { login }
              }
              ... on PullRequest {
                id
                number
                title
                url
                state
                createdAt
                updatedAt
                closedAt
                mergedAt
                merged
                author { login }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      const searchQuery = `involves:${username} (created:>=${sinceDate} OR updated:>=${sinceDate} OR merged:>=${sinceDate} OR closed:>=${sinceDate})`;
      const variables = {
        searchQuery,
        after: endCursor,
      };
      const data = await octokit.graphql<any>(query, variables);
      const search = data.search;
      if (!search) break;
      if (search.nodes) {
        allNodes.push(...search.nodes);
      }
      hasNextPage = search.pageInfo.hasNextPage;
      endCursor = search.pageInfo.endCursor;
      if (!hasNextPage) break;
    }
    // Filter strictly by date fields in code
    const since = new Date(sinceDate);
    const filteredNodes = allNodes.filter(node => {
      const fields = [
        'createdAt',
        'updatedAt',
        'closedAt',
        'mergedAt',
      ] as const;
      return fields.some(
        field => node[field] && new Date(node[field]) >= since
      );
    });
    // Return in the same structure as before for compatibility
    return {
      user: {
        issues: {
          nodes: filteredNodes.filter(n => n.__typename === 'Issue'),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
        pullRequests: {
          nodes: filteredNodes.filter(n => n.__typename === 'PullRequest'),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    };
  }
}
