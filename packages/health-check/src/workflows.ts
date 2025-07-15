import logger from './utils/logger.js';
import { GitHubWorkflowEntity } from '@dfb/db';
import { WorkflowService, WorkflowWithStatus } from '@dfb/octokit';
import pLimit from 'p-limit';
import DataConfig from './config/index.js';

export async function fetchWorkflowFromGitHub(
  configData: DataConfig
): Promise<void> {
  try {
    if (!configData || !configData.githubClient) {
      logger.error(
        'GitHub API client is not initialized. Please check your configuration and ensure a valid GitHub token is provided.'
      );
      return;
    }

    const apiClient = configData.githubClient;
    const repoService = new WorkflowService(apiClient);

    const limit = pLimit(5); // Limit concurrency to 5

    const repos = Array.from(configData.repositories || []);
    await Promise.all(
      repos.map(repo =>
        limit(() => fetchAndInsertWorkflow(repo, repoService, configData))
      )
    );

    /**
     * Fetch workflows for a repository, normalize, add to config, and insert into DB.
     */
    async function fetchAndInsertWorkflow(
      repo: { owner?: string; name?: string },
      repoService: WorkflowService,
      configData: DataConfig
    ): Promise<void> {
      if (!repo || !repo.owner || !repo.name) {
        logger.warn('Skipping repository with missing org or repo name.');
        return;
      }

      const workflows: WorkflowWithStatus[] =
        await repoService.getWorkflowsWithStatus(repo.owner, repo.name);
      if (workflows && workflows.length > 0) {
        const dbWorkflows: GitHubWorkflowEntity[] = workflows.map(wf =>
          normalizeGitHubWorkflowToEntity(wf, `${repo.owner}/${repo.name}`)
        );

        for (const dbWorkflow of dbWorkflows) {
          configData.workflows?.add(dbWorkflow);
        }

        await configData.db.databaseServices.workflowService.insertBatch(
          dbWorkflows
        );
      }
    }

    return;
  } catch (error) {
    logger.error(
      `Error fetching workflows ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Normalize a WorkflowWithStatus (from Octokit/GraphQL/REST) to a GitHubWorkflowEntity (DB entity).
 * @param workflow - The workflow object from the API
 * @param repoNameWithOwner - The repository name in the format 'owner/repo'
 */
function normalizeGitHubWorkflowToEntity(
  workflow: WorkflowWithStatus,
  repoNameWithOwner: string
): GitHubWorkflowEntity {
  return {
    id: workflow.id,
    node_id: workflow.node_id ?? '',
    name: workflow.name ?? '',
    org_repo: repoNameWithOwner,
    path: workflow.path ?? '',
    state: workflow.state ?? '',
    url: workflow.url ?? '',
    created_at: workflow.created_at ?? '',
    updated_at: workflow.updated_at ?? '',
    last_run_id: workflow.lastRunId?.toString() ?? '',
    last_run_status: workflow.lastRunStatus ?? '',
    last_run_date: workflow.lastRunDate ?? '',
    last_run_url: workflow.lastRunUrl ?? '',
  };
}
