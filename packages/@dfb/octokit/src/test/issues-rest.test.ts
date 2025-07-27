import { describe, it, expect } from 'vitest';
import { githubRestSearchIssues } from '../entities/rest-query.js';
import { getDaysAgo } from '../utils/datetime.js';

// Integration test for IssueService REST
//https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests#search-by-a-user-thats-involved-in-an-issue-or-pull-request
describe('IssueService (REST)', () => {
  it('should fetch recent involved issues and PRs for a user (happy path)', async () => {
    const token = process.env.GITHUB_TOKEN || '';
    if (!token) {
      console.warn('No GITHUB_TOKEN set, skipping integration test.');
      return;
    }
    const username = 'dfberry'; // Use a real GitHub username with public activity
    const daysAgo = 30;
    const gotDaysAgo = getDaysAgo(daysAgo);
    //console.log('Using since date:', gotDaysAgo);

    //const query = `involves:${username} AND (created:>2025-07-01 OR updated:>2025-07-01 OR merged:>2025-07-01 OR closed:>2025-07-01)`;
    const query = `involves:${username} AND (created:>${gotDaysAgo} OR updated:>${gotDaysAgo} OR merged:>${gotDaysAgo} OR closed:>${gotDaysAgo})`;

    console.log('Using query:', query);

    const result = await githubRestSearchIssues({
      token,
      query,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);

    for (const issue of result) {
      console.log(issue);
    }
  });
});
