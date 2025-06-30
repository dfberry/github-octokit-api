import GitHubApiClient from './api-client.js';
import type { WorkflowRun } from '../models.js';

export class WorkflowRunService {
  constructor(private api: GitHubApiClient) {}

  async getWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: number
  ): Promise<WorkflowRun[]> {
    const octokit = this.api.getRest();
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      per_page: 20,
    });
    return data.workflow_runs as unknown as WorkflowRun[];
  }

  async getWorkflowRunsGraphql(
    owner: string,
    repo: string,
    workflowId: number
  ): Promise<WorkflowRun[]> {
    const graphql = this.api.getGraphql();
    const query = `
      query($owner: String!, $repo: String!, $workflowId: ID!) {
        repository(owner: $owner, name: $repo) {
          workflow: node(id: $workflowId) {
            ... on Workflow {
              runs(first: 20) {
                nodes {
                  id
                  status
                  conclusion
                  createdAt
                  updatedAt
                  url
                }
              }
            }
          }
        }
      }
    `;
    const result = await graphql.graphql(query, {
      owner,
      repo,
      workflowId: String(workflowId),
    });
    const runs = ((result as Record<string, any>).repository?.workflow?.runs
      ?.nodes || []) as WorkflowRun[];
    return runs;
  }
}

export default WorkflowRunService;
