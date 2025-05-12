import { Octokit } from 'octokit';

import {
  Commit,
  DependabotAlert,
  Issue,
  IssueType,
  PullRequest,
  RepoSearchOrder,
  PRSearchSort,
  RepoSearchSort,
  Repository,
  SearchRepositoryItem,
  Workflow,
  PrSearchItem,
  SimpleRepositoryError,
  // Import the new types
  WorkflowRun,
  RepoSecret,
  OrgSecret,
  SelfHostedRunner,
  GitHubRequestorError,
} from '../models.js';

// Alias for workflows response type that we didn't export from models.ts

// Alias for workflows response type that we didn't export from models.ts
export function isRepositoryError(obj: any): obj is SimpleRepositoryError {
  return (
    obj &&
    typeof obj === 'object' &&
    'error' in obj &&
    'found' in obj &&
    obj.found === false
  );
}

export function isGitHubRequestorError(obj: any): obj is GitHubRequestorError {
  return (
    obj &&
    typeof obj === 'object' &&
    'functionName' in obj &&
    'errorMessage' in obj &&
    'timestamp' in obj
  );
}

export default class GitHubRequestor {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Helper method to create standardized error objects
   */
  private createError(
    functionName: string,
    error: any,
    requestParams?: Record<string, any>
  ): GitHubRequestorError {
    let errorCode: number | undefined;
    let errorMessage: string;

    if (error.status) {
      errorCode = error.status;
      errorMessage = error.message || 'Unknown error';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    return {
      functionName,
      errorCode,
      errorMessage,
      timestamp: new Date(),
      request: requestParams,
    };
  }

  async getRepo(
    org: string,
    repo: string
  ): Promise<Repository | GitHubRequestorError> {
    try {
      console.log(`Fetching repository data for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.get({
        owner: org,
        repo: repo,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching repository data: ${error}`);
      return this.createError('getRepo', error, { org, repo });
    }
  }

  /**
   * Get contents of a repository at a specific path
   * @param org Repository owner
   * @param repo Repository name
   * @param path Path to get contents from (root = '')
   * @returns Array of content items or a single content item
   */
  async getRepoContents(
    org: string,
    repo: string,
    path: string
  ): Promise<any[] | any | GitHubRequestorError> {
    try {
      console.log(`Fetching contents at path "${path}" for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.getContent({
        owner: org,
        repo: repo,
        path: path,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching repository contents at "${path}": ${error}`
      );
      return this.createError('getRepoContents', error, { org, repo, path });
    }
  }

  async getSearchRepository(
    q: string = 'org:azure-samples',
    per_page: number = 5,
    sort: RepoSearchSort = 'updated',
    order: RepoSearchOrder = 'desc'
  ): Promise<SearchRepositoryItem[] | GitHubRequestorError> {
    try {
      const params = {
        q,
        sort: sort,
        order,
        per_page,
      };
      console.log(`Parameters: ${JSON.stringify(params)}`);

      const response = await this.octokit.rest.search.repos(params);
      console.log(`Found ${response.data.total_count} repositories`);

      return response.data.items;
    } catch (error) {
      console.error(`Error search repository: ${error}`);
      return this.createError('getSearchRepository', error, {
        q,
        per_page,
        sort,
        order,
      });
    }
  }

  async searchIssuesAndPrs(
    q: string,
    page: number = 1,
    per_page: number = 5,
    sort: PRSearchSort = 'created',
    order: RepoSearchOrder = 'desc'
  ): Promise<PrSearchItem[] | GitHubRequestorError> {
    try {
      console.log(`Searching issues and PRs for query: ${q}`);

      // Using the direct request method which is less likely to be deprecated
      const response = await this.octokit.request('GET /search/issues', {
        q,
        sort,
        order,
        per_page,
        page,
      });

      console.log(`Found ${response.data.total_count} issues and PRs`);
      return response.data.items;
    } catch (error) {
      console.error(`Error searching issues and PRs: ${error}`);
      return this.createError('searchIssuesAndPrs', error, {
        q,
        page,
        per_page,
        sort,
        order,
      });
    }
  }

  async getRepoTopics(
    org: string,
    repo: string
  ): Promise<string[] | GitHubRequestorError> {
    try {
      console.log(`Fetching repository topics for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.getAllTopics({
        owner: org,
        repo: repo,
      });
      return response.data.names || [];
    } catch (error) {
      console.error(`Error fetching repository topics: ${error}`);
      return this.createError('getRepoTopics', error, { org, repo });
    }
  }

  // state: "open" | "closed" | "all"
  async getIssues(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<Issue[] | GitHubRequestorError> {
    try {
      console.log(`Fetching issues for ${org}/${repo}`);
      const response = await this.octokit.rest.issues.listForRepo({
        owner: org,
        repo: repo,
        state: state,
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching issues: ${error}`);
      return this.createError('getIssues', error, { org, repo, state, limit });
    }
  }

  async getPullRequests(
    org: string,
    repo: string,
    limit = 1
  ): Promise<PullRequest[] | GitHubRequestorError> {
    try {
      console.log(`Fetching pull requests for ${org}/${repo}`);
      const response = await this.octokit.rest.pulls.list({
        owner: org,
        repo: repo,
        state: 'open',
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching pull requests: ${error}`);
      return this.createError('getPullRequests', error, { org, repo, limit });
    }
  }

  async searchPullRequests(
    query: string,
    page: number = 1,
    limit = 1,
    sort: PRSearchSort,
    order: RepoSearchOrder
  ): Promise<PrSearchItem[] | GitHubRequestorError> {
    try {
      console.log(`Searching pull requests for ${query}`);
      const response = await this.octokit.request('GET /search/issues', {
        q: query,
        sort: sort,
        order: order,
        per_page: limit,
        page: page,
      });
      return response.data.items;
    } catch (error) {
      console.error(`Error searching pull requests: ${error}`);
      return this.createError('searchPullRequests', error, {
        query,
        page,
        limit,
        sort,
        order,
      });
    }
  }

  async getCommits(
    org: string,
    repo: string,
    limit = 1
  ): Promise<Commit[] | GitHubRequestorError> {
    try {
      console.log(`Fetching commits for ${org}/${repo}`);
      const response = await this.octokit.rest.repos.listCommits({
        owner: org,
        repo: repo,
        per_page: limit,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching commits: ${error}`);
      return this.createError('getCommits', error, { org, repo, limit });
    }
  }

  async getDependabotAlerts(
    org: string,
    repo: string,
    state: IssueType = 'open',
    limit = 1
  ): Promise<DependabotAlert[] | GitHubRequestorError> {
    try {
      console.log(`Fetching dependabot alerts for ${org}/${repo}`);
      const response = await this.octokit.rest.dependabot.listAlertsForRepo({
        owner: org,
        repo: repo,
        per_page: limit,
        state: state,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching dependabot alerts: ${error}`);
      return this.createError('getDependabotAlerts', error, {
        org,
        repo,
        state,
        limit,
      });
    }
  }

  async getRepoWorkflows(
    org: string,
    repo: string
  ): Promise<Workflow[] | GitHubRequestorError> {
    try {
      console.log(`Fetching workflows for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.listRepoWorkflows({
        owner: org,
        repo: repo,
      });
      return response.data.workflows;
    } catch (error) {
      console.error(`Error fetching workflows: ${error}`);
      return this.createError('getRepoWorkflows', error, { org, repo });
    }
  }

  async getWorkflowRun(
    org: string,
    repo: string,
    runId: number
  ): Promise<WorkflowRun | GitHubRequestorError> {
    try {
      console.log(`Fetching workflow run ${runId} for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner: org,
        repo: repo,
        run_id: runId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow run ${runId}: ${error}`);
      return this.createError('getWorkflowRun', error, { org, repo, runId });
    }
  }

  async getWorkflow(
    org: string,
    repo: string,
    workflowId: number | string
  ): Promise<Workflow | GitHubRequestorError> {
    try {
      console.log(`Fetching workflow ${workflowId} for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.getWorkflow({
        owner: org,
        repo: repo,
        workflow_id: workflowId,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}: ${error}`);
      return this.createError('getWorkflow', error, { org, repo, workflowId });
    }
  }

  async listRepoSecrets(
    org: string,
    repo: string,
    perPage: number = 100
  ): Promise<RepoSecret[] | GitHubRequestorError> {
    try {
      console.log(`Fetching repository secrets for ${org}/${repo}`);
      const response = await this.octokit.rest.actions.listRepoSecrets({
        owner: org,
        repo: repo,
        per_page: perPage,
      });
      return response.data.secrets;
    } catch (error) {
      console.error(`Error fetching repository secrets: ${error}`);
      return this.createError('listRepoSecrets', error, { org, repo, perPage });
    }
  }

  async listOrgSecrets(
    org: string,
    perPage: number = 100
  ): Promise<OrgSecret[] | GitHubRequestorError> {
    try {
      console.log(`Fetching organization secrets for ${org}`);
      const response = await this.octokit.rest.actions.listOrgSecrets({
        org: org,
        per_page: perPage,
      });
      return response.data.secrets;
    } catch (error) {
      console.error(`Error fetching organization secrets: ${error}`);
      return this.createError('listOrgSecrets', error, { org, perPage });
    }
  }

  async listSelfHostedRunnersForRepo(
    org: string,
    repo: string,
    perPage: number = 100
  ): Promise<SelfHostedRunner[] | GitHubRequestorError> {
    try {
      console.log(`Fetching self-hosted runners for ${org}/${repo}`);
      const response =
        await this.octokit.rest.actions.listSelfHostedRunnersForRepo({
          owner: org,
          repo: repo,
          per_page: perPage,
        });
      return response.data.runners;
    } catch (error) {
      console.error(`Error fetching self-hosted runners: ${error}`);
      return this.createError('listSelfHostedRunnersForRepo', error, {
        org,
        repo,
        perPage,
      });
    }
  }

  async listWorkflowRuns(
    org: string,
    repo: string,
    workflowId: number,
    perPage: number = 1
  ): Promise<WorkflowRun[] | GitHubRequestorError> {
    try {
      console.log(
        `Fetching workflow runs for workflow ${workflowId} in ${org}/${repo}`
      );
      const response = await this.octokit.rest.actions.listWorkflowRuns({
        owner: org,
        repo: repo,
        workflow_id: workflowId,
        per_page: perPage,
      });
      return response.data.workflow_runs;
    } catch (error) {
      console.error(`Error fetching workflow runs: ${error}`);
      return this.createError('listWorkflowRuns', error, {
        org,
        repo,
        workflowId,
        perPage,
      });
    }
  }
}
