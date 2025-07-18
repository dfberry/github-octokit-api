import { GitHubApiClient } from './client.js';
import type { OctokitUser, OctokitSearchIssue } from './models.js';
export class ContributorService {
  constructor(private api: GitHubApiClient) {}

  async getContributor(username: string): Promise<OctokitUser | null> {
    const octokit = this.api.getRest();
    try {
      const { data: user } = await octokit.rest.users.getByUsername({
        username,
      });

      return user as OctokitUser;
    } catch (error) {
      console.error(
        `Failed to fetch contributor data for username: ${username}`,
        error
      );
      return null;
    }
  }

  async getContributorPRs(
    username: string,
    orgs: string[],
    sinceDate: string
  ): Promise<OctokitSearchIssue[]> {
    const octokit = this.api.getRest();

    try {
      const query = `author:${username} is:pr created:>=${sinceDate}`;

      // assume no more than 100 in a week
      const { data } = await octokit.rest.search.issuesAndPullRequests({
        q: query,
        per_page: 100,
      });
      return data.items as OctokitSearchIssue[];
    } catch (error) {
      console.error(
        `Failed to fetch PRs for username: ${username}, since: ${sinceDate}`,
        error
      );
      throw error;
    }
  }
}
