import { describe, it, expect } from 'vitest';
import { IssueServiceGraphQL } from '../entities/issue-service-graphql.js';
import type {
  GraphQLUserIssuesAndPRs,
  GraphQLIssueNode,
  GraphQLPullRequestNode,
} from '../entities/models-graphql.js';

describe('IssueServiceGraphQL', () => {
  it('should fetch recent involved issues and PRs for a user (happy path)', async () => {
    const token = process.env.GITHUB_TOKEN || '';
    if (!token) {
      console.warn('No GITHUB_TOKEN set, skipping integration test.');
      return;
    }
    const username = 'dfberry';
    const daysAgo = 30;
    const service = new IssueServiceGraphQL();

    const response: GraphQLUserIssuesAndPRs =
      await service.getRecentInvolvedIssues(token, username, daysAgo);

    expect(response.user).toBeDefined();
    if (!response.user) throw new Error('user is null');
    expect(response.user.issues).toBeDefined();
    expect(response.user.pullRequests).toBeDefined();
    expect(Array.isArray(response.user.issues.nodes)).toBe(true);
    expect(Array.isArray(response.user.pullRequests.nodes)).toBe(true);
    // Type assertions for node arrays
    response.user.issues.nodes.forEach(node => {
      const issue: GraphQLIssueNode = node;
      expect(issue.id).toBeDefined();
      expect(issue.title).toBeDefined();
    });
    response.user.pullRequests.nodes.forEach(node => {
      const pr: GraphQLPullRequestNode = node;
      expect(pr.id).toBeDefined();
      expect(pr.title).toBeDefined();
    });
  });
});
