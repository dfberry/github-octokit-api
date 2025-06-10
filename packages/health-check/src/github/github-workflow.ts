import GitHubRequestor, { isGitHubRequestorError } from './github.js';
import { WorkflowWithStatus } from '../models.js';

export default class GitHubWorkflow {
  protected requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  /**
   * Fetches all GitHub Actions workflows in a repository and their latest run status
   * @param org The organization or user name
   * @param repo The repository name
   * @returns An array of workflow objects with their latest run status
   */
  async getWorkflowsWithStatus(
    org: string,
    repo: string
  ): Promise<WorkflowWithStatus[]> {
    try {
      console.log(`Fetching workflows with status for ${org}/${repo}`);

      // First get all workflows
      const workflows = await this.requestor.getRepoWorkflows(org, repo);

      // If we got an error instead of workflows, return empty array
      if (isGitHubRequestorError(workflows)) {
        console.error(`Error fetching workflows: ${workflows.errorMessage}`);
        return [];
      }

      // For each workflow, get the latest run
      const workflowsWithStatus = await Promise.all(
        workflows.map(async workflow => {
          try {
            // Get workflow runs using the workflow id
            const runsResponse = await this.requestor.listWorkflowRuns(
              org,
              repo,
              workflow.id,
              1 // Get only the latest run
            );

            if (isGitHubRequestorError(runsResponse)) {
              console.error(
                `Error fetching runs for workflow ${workflow.name}: ${runsResponse.errorMessage}`
              );
              return {
                id: workflow.id,
                name: workflow.name,
                path: workflow.path,
                state: workflow.state,
                latestRun: null,
              };
            }

            // If there are no runs for this workflow, return null for latestRun
            if (!runsResponse.length) {
              return {
                id: workflow.id,
                name: workflow.name,
                path: workflow.path,
                state: workflow.state,
                latestRun: null,
              };
            }

            // Get the first (latest) run
            const latestRun = runsResponse[0];

            // For this workflow, create a WorkflowWithStatus object
            return {
              id: workflow.id,
              name: workflow.name,
              path: workflow.path,
              state: workflow.state,
              latestRun: {
                id: latestRun.id,
                status: latestRun.status,
                conclusion: latestRun.conclusion,
                createdAt: latestRun.created_at,
                updatedAt: latestRun.updated_at,
                htmlUrl: latestRun.html_url,
              },
            };
          } catch (error) {
            console.error(
              `Error processing workflow ${workflow.name}: ${error}`
            );
            return {
              id: workflow.id,
              name: workflow.name,
              path: workflow.path,
              state: workflow.state,
              latestRun: null,
            };
          }
        })
      );

      return workflowsWithStatus;
    } catch (error) {
      console.error(`Error fetching workflows with status: ${error}`);
      return [];
    }
  }
}
