import { GitHubApiClient } from './client.js';
import type { WorkflowWithStatus } from './models.js';
export class WorkflowService {
  constructor(private api: GitHubApiClient) {}

  async getWorkflowsWithStatus(
    owner: string,
    repo: string
  ): Promise<WorkflowWithStatus[]> {
    const octokit = this.api.getRest();
    let repoWorkflowsData;
    try {
      const { data } = await octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });
      repoWorkflowsData = data;
    } catch (err) {
      console.warn(
        `[WorkflowService] Failed to fetch workflows for ${owner}/${repo}: %O`,
        err
      );
      return [];
    }
    const workflows: WorkflowWithStatus[] = [];
    await Promise.all(
      repoWorkflowsData.workflows.map(async (wf: WorkflowWithStatus) => {
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
            `[WorkflowService] Failed to fetch runs for workflow ${wf.id} in ${owner}/${repo}: %O`,
            err
          );
          runsData = { workflow_runs: [] };
        }
        workflows.push({
          ...wf,
          lastRunId: runsData.workflow_runs[0]?.id
            ? `${runsData.workflow_runs[0].id}`
            : null,
          lastRunStatus: runsData.workflow_runs[0]?.status || null,
          lastRunDate: runsData.workflow_runs[0]?.created_at || null,
          lastRunUrl: runsData.workflow_runs[0]?.url || null,
        });
      })
    );

    return workflows;
  }
}
