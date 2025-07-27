import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { OctokitAuthenticatedUser } from './models.js';

const MyOctokit = Octokit.plugin(retry);

export class GitHubApiClient {
  private rest: Octokit;
  private graphql: Octokit;

  constructor(token: string) {
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

  async getAndTestGitHubToken(): Promise<{
    rest: OctokitAuthenticatedUser;
    graphql: { login: string };
  }> {
    try {
      const { data } = await this.rest.rest.users.getAuthenticated();
      console.log(`Authenticated as GitHub user: ${data.login}`);

      const { viewer } = await this.graphql.graphql<{
        viewer: { login: string };
      }>(
        `query {
          viewer {
            login
          }
        }`
      );
      console.log(`Authenticated as GitHub user (GraphQL): ${viewer.login}`);

      return {
        rest: data,
        graphql: viewer,
      };
    } catch (error) {
      console.error('Failed to authenticate with GitHub:', error);
      throw error;
    }
  }
}
