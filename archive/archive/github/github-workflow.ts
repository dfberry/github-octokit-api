import GitHubRequestor, { isGitHubRequestorError } from './github.js';
import type { WorkflowWithRunStatus } from '../../src/models.js';
export default class GitHubWorkflow {
  protected requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  /**
   * Fetches all GitHub Actions workflows in a repository and their latest run status,
   * returning the full workflow and run objects as provided by the Octokit REST API.
   * @param org The organization or user name
   * @param repo The repository name
   * @returns An array of workflow objects with their latest run (all supported fields)
   */
  async getWorkflowsWithStatus(
    org: string,
    repo: string
  ): Promise<WorkflowWithRunStatus[]> {
    try {
      console.log(`Fetching workflows with status for ${org}/${repo}`);

      // Get all workflows (full objects)
      const workflows = await this.requestor.getRepoWorkflows(org, repo);

      if (isGitHubRequestorError(workflows)) {
        console.error(`Error fetching workflows: ${workflows.errorMessage}`);
        return [];
      }

      // For each workflow, get the latest run (full object)
      const workflowsWithStatus = await Promise.all(
        workflows.map(async (workflow: any) => {
          try {
            const runsResponse = await this.requestor.listWorkflowRuns(
              org,
              repo,
              workflow.id,
              1 // Only the latest run
            );

            if (isGitHubRequestorError(runsResponse)) {
              console.error(
                `Error fetching runs for workflow ${workflow.name}: ${runsResponse.errorMessage}`
              );
              return {
                ...workflow,
                latestRun: null,
              };
            }

            // If there are no runs for this workflow, return null for latestRun
            if (!runsResponse.length) {
              return {
                ...workflow,
                latestRun: null,
              };
            }

            // Attach the full latest run object
            return {
              ...workflow,
              latestRun: runsResponse[0],
            };
          } catch (error) {
            console.error(
              `Error processing workflow ${workflow.name}: ${error}`
            );
            return {
              ...workflow,
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
