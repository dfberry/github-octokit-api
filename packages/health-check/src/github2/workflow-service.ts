import GitHubApiClient from './api-client.js';
import type { WorkflowWithStatus } from './models.js';

export default class WorkflowService {
  constructor(private api: GitHubApiClient) {}

  async getWorkflowsWithStatus(
    owner: string,
    repo: string
  ): Promise<WorkflowWithStatus[]> {
    const octokit = this.api.getRest();
    let repoWorkflowsData;
    try {
      console.log(`[WorkflowService] Fetching workflows for ${owner}/${repo}`);

      const { data } = await octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });
      repoWorkflowsData = data;
    } catch (err) {
      console.warn(
        `[WorkflowService] Failed to fetch workflows for ${owner}/${repo}:`,
        err
      );
      return [];
    }
    const workflows: any[] = [];
    for await (const wf of repoWorkflowsData.workflows) {
      let runsData;
      try {
        const { data } = await octokit.rest.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id: wf.id,
          per_page: 1,
        });
        runsData = data;
      } catch (err) {
        console.warn(
          `[WorkflowService] Failed to fetch runs for workflow ${wf.id} in ${owner}/${repo}:`,
          err
        );
        runsData = { workflow_runs: [] };
      }
      workflows.push({
        id: wf.id,
        orgRepo: `${owner}/${repo}`,
        name: wf.name,
        path: wf.path,
        state: wf.state,
        created_at: wf.created_at,
        updated_at: wf.updated_at,
        url: wf.html_url,
        latestRunId: runsData.workflow_runs[0]?.id
          ? `${runsData.workflow_runs[0].id}`
          : null,
        lastRunStatus: runsData.workflow_runs[0]?.status || null,
        lastRunDate: runsData.workflow_runs[0]?.created_at || null,
        lastRunUrl: runsData.workflow_runs[0]?.url || null,
      });
    }
    return workflows;
  }
}
