import GitHubApiClient from './api-client.js';
import type { OctokitDependabotAlert } from './models.js';

export type DependabotAlertResult = {
  alerts: OctokitDependabotAlert[];
  status: 'ok' | 'unauthorized' | 'disabled' | 'error';
  message?: string;
};

export default class DependabotAlertService {
  constructor(private api: GitHubApiClient) {}

  async getAlertsForRepo(
    owner: string,
    repo: string
  ): Promise<DependabotAlertResult> {
    const octokit = this.api.getRest();
    try {
      console.log(
        `[DependabotAlertService] Fetching first 100 dependabot alerts for ${owner}/${repo}`
      );
      const { data } = await octokit.rest.dependabot.listAlertsForRepo({
        owner,
        repo,
        per_page: 100,
      });
      return { alerts: Array.isArray(data) ? data : [], status: 'ok' };
    } catch (err: any) {
      if (err.status === 403 && err.message?.includes('not authorized')) {
        return { alerts: [], status: 'unauthorized', message: err.message };
      }
      if (
        err.message?.includes(
          'Dependabot alerts are disabled for this repository'
        )
      ) {
        return { alerts: [], status: 'disabled', message: err.message };
      }
      console.warn(
        `[DependabotAlertService] Failed to fetch dependabot alerts for ${owner}/${repo}:`,
        err
      );
      return { alerts: [], status: 'error', message: err.message };
    }
  }
}
