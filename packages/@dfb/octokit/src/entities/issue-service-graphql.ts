import { getDaysAgo } from '../utils/datetime.js';
import { githubGraphQLSearchIssues } from './graphql-query.js';
import type {
  GraphQLUserIssuesAndPRs,
  GraphQLIssueNode,
  GraphQLPullRequestNode,
  GraphQLSearchResult,
} from './models-graphql.js';

export class IssueServiceGraphQL {
  /**
   * Fetches all issues and PRs a user has touched (author, assignee, commenter) in the last N days using the GraphQL API.
   * @param username - The GitHub username
   * @param daysAgo - Number of days in the past to include
   */
  async getRecentInvolvedIssues(
    token: string,
    username: string,
    daysAgo: number
  ): Promise<GraphQLUserIssuesAndPRs> {
    const sinceDate = getDaysAgo(daysAgo);
    const gql = `
      query ($username: String!) {
        user(login: $username) {
          login
          name
          issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
            totalCount
            nodes {
              id
              number
              title
              url
              createdAt
              updatedAt
              closedAt
              state
              author { login }
            }
          }
          pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
            totalCount
            nodes {
              id
              number
              title
              url
              createdAt
              updatedAt
              closedAt
              mergedAt
              state
              merged
              author { login }
            }
          }
        }
      }
    `;
    const response = await githubGraphQLSearchIssues({
      token,
      query: gql,
      queryParams: { username },
    });

    const isAfter = (date: string | null | undefined) =>
      date && new Date(date) >= new Date(sinceDate);

    const issues = (response.user.issues.nodes || []).filter(
      (node: GraphQLIssueNode) => {
        const dateFields: (keyof GraphQLIssueNode)[] = [
          'createdAt',
          'updatedAt',
          'closedAt',
        ];
        return dateFields.some(field => {
          const value = node[field];
          return typeof value === 'string' && isAfter(value);
        });
      }
    );

    const pullRequests = (response.user.pullRequests.nodes || []).filter(
      (node: GraphQLPullRequestNode) => {
        const dateFields: (keyof GraphQLPullRequestNode)[] = [
          'createdAt',
          'updatedAt',
          'closedAt',
          'mergedAt',
        ];
        return dateFields.some(field => {
          const value = node[field];
          return typeof value === 'string' && isAfter(value);
        });
      }
    );

    return {
      user: {
        issues: {
          ...response.user.issues,
          nodes: issues,
        },
        pullRequests: {
          ...response.user.pullRequests,
          nodes: pullRequests,
        },
      },
    };
  }
}
