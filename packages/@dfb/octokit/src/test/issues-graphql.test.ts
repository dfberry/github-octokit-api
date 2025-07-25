import { describe, it, expect } from 'vitest';
import { githubGraphQLSearchIssues } from '../entities/graphql-query.js';
import { getDaysAgo } from '../utils/datetime.js';

describe('githubGraphQLSearchIssues (GraphQL)', () => {
  it('should fetch recent involved issues and PRs for a user (happy path)', async () => {
    const token = process.env.GITHUB_TOKEN || '';
    if (!token) {
      console.warn('No GITHUB_TOKEN set, skipping integration test.');
      return;
    }
    const username = `dfberry`;
    const daysAgo = 30;
    const gotDaysAgo = getDaysAgo(daysAgo);

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
                    author { login}
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

    console.log('Using query:', gql);

    const response = await githubGraphQLSearchIssues({
      token,
      query: gql,
      queryParams: {
        username,
      },
    });

    // The GraphQL response shape is: { user: { issues: { nodes: [...] }, pullRequests: { nodes: [...] } } }
    expect(response.user).toBeDefined();
    expect(response.user.issues).toBeDefined();
    expect(response.user.pullRequests).toBeDefined();
    expect(Array.isArray(response.user.issues.nodes)).toBe(true);
    expect(Array.isArray(response.user.pullRequests.nodes)).toBe(true);

    const isAfter = (date: string | null | undefined) =>
      date && new Date(date) >= new Date(gotDaysAgo);

    const issues = (response.user.issues.nodes || []).filter((node: any) => {
      const dateFields = ['createdAt', 'updatedAt', 'closedAt'];
      return dateFields.some(field => isAfter(node[field]));
    });

    const pullRequests = (response.user.pullRequests.nodes || []).filter(
      (node: any) => {
        const dateFields = ['createdAt', 'updatedAt', 'closedAt', 'mergedAt'];
        return dateFields.some(field => isAfter(node[field]));
      }
    );

    console.log('Filtered issues:', issues);
    console.log('Filtered PRs:', pullRequests);
  });
});
