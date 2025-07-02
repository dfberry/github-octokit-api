import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { OctokitAuthenticatedUser } from './models.js'; // Adjust the import path as necessary

const MyOctokit = Octokit.plugin(retry);

export default class GitHubApiClient {
  private rest: Octokit;
  private graphql: Octokit;

  constructor() {
    const token = process.env.GITHUB_TOKEN || '';

    console.log(
      'Initializing GitHub API client with token:',
      token ? '[REDACTED]' : 'not provided'
    );

    this.rest = new MyOctokit({
      auth: token,
      request: {
        retries: 3, // Number of retries for failed requests
        retryAfter: 2, // Seconds to wait before retrying
      },
      retry: {
        doNotRetry: ['429'], // Optionally skip retrying on rate limit
      },
    });

    this.graphql = new MyOctokit({
      auth: token,
      request: {
        retries: 3,
        retryAfter: 2,
      },
      retry: {
        doNotRetry: ['429'],
      },
    });
  }

  getRest(): Octokit {
    return this.rest;
  }
  getGraphql(): Octokit {
    return this.graphql;
  }

  async getAndTestGitHubToken(): Promise<OctokitAuthenticatedUser> {
    try {
      const { data } = await this.rest.rest.users.getAuthenticated();
      console.log('Authenticated as:', data.login);
      return data;
    } catch (error) {
      console.error('Failed to authenticate with GitHub:', error);
      throw error;
    }
  }

  // Example: skip archived repos before querying
  async isRepoArchived(owner: string, repo: string): Promise<boolean> {
    const { data } = await this.rest.rest.repos.get({ owner, repo });
    return data.archived;
  }
}
