import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { OctokitAuthenticatedUser } from './models.js'; // Adjust the import path as necessary
export default class GitHubApiClient {
  private rest: Octokit;
  private graphql: Octokit;

  constructor() {
    const token = process.env.GITHUB_TOKEN || '';

    console.log(
      'Initializing GitHub API client with token:',
      token || 'not provided'
    );

    const MyOctokit = Octokit.plugin(retry);
    this.rest = new MyOctokit({ auth: process.env.GITHUB_TOKEN || token });
    this.graphql = new MyOctokit({ auth: process.env.GITHUB_TOKEN || token });
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
}
