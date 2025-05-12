import { Commit, RepoData, SearchRepositoryItem } from '../models.js';

import GitHubRequestor, {
  isRepositoryError,
  isGitHubRequestorError,
} from './github.js';

export default class RepoDataCollector {
  private requestor: GitHubRequestor;

  constructor(token: string) {
    this.requestor = new GitHubRequestor(token);
  }

  async collectRepoData(repo: {
    org: string;
    repo: string;
  }): Promise<RepoData> {
    // Get repository information
    let stars = 0,
      forks = 0,
      watchers = 0;
    let description = '';

    const retrievedRepo = await this.requestor.getRepo(repo.org, repo.repo);

    // TypeGuard: if SimpleRepositoryError or GitHubRequestorError, return empty object
    if (
      isRepositoryError(retrievedRepo) ||
      isGitHubRequestorError(retrievedRepo)
    ) {
      const errorMessage = isRepositoryError(retrievedRepo)
        ? retrievedRepo.error
        : retrievedRepo.errorMessage;

      console.error(
        `Repository ${repo.org}/${repo.repo} not found. Error: ${errorMessage}`
      );
      return {
        name: repo.repo,
        org: repo.org,
        repo: repo.repo,
        full_name: `${repo.org}/${repo.repo}`,
        description: '',
        issues: 0,
        prsCount: 0,
        stars: 0,
        forks: 0,
        watchers: 0,
        lastCommitDate: '',
        lastCommitterLogin: '',
        lastCommitterAvatar: '',
        lastCommitterUrl: '',
        securityNotices: 0,
        hasVulnerabilities: false,
        dependabotAlerts: 0,
        codeScanning: false,
        topics: [],
      };
    }

    // Get stars, forks, watchers and description from the repository data
    stars = retrievedRepo.stargazers_count || 0;
    forks = retrievedRepo.forks_count || 0;
    watchers = retrievedRepo.watchers_count || 0;
    description = retrievedRepo.description || '';

    // Get issues - now handling possible GitHubRequestorError
    const issues = await this.requestor.getIssues(repo.org, repo.repo);
    const issuesCount = isGitHubRequestorError(issues) ? 0 : issues.length;
    if (isGitHubRequestorError(issues)) {
      console.warn(`Failed to fetch issues: ${issues.errorMessage}`);
    }

    // Get topics - handling possible GitHubRequestorError
    const topicsResult = await this.requestor.getRepoTopics(
      repo.org,
      repo.repo
    );
    const topics = isGitHubRequestorError(topicsResult) ? [] : topicsResult;
    if (isGitHubRequestorError(topicsResult)) {
      console.warn(`Failed to fetch topics: ${topicsResult.errorMessage}`);
    }

    // Get pull requests - handling possible GitHubRequestorError
    const prs = await this.requestor.getPullRequests(repo.org, repo.repo);
    const prsCount = isGitHubRequestorError(prs) ? 0 : prs.length;
    if (isGitHubRequestorError(prs)) {
      console.warn(`Failed to fetch pull requests: ${prs.errorMessage}`);
    }

    // Get last commit date and committer information
    let lastCommit = {} as Commit;
    let lastCommitDate = '';
    let lastCommitterLogin = '';
    let lastCommitterAvatar = '';
    let lastCommitterUrl = '';

    const commits = await this.requestor.getCommits(repo.org, repo.repo);

    if (isGitHubRequestorError(commits)) {
      console.warn(`Failed to fetch commits: ${commits.errorMessage}`);
    } else if (commits.length === 0) {
      console.log(`No commits found for ${repo.org}/${repo.repo}`);
    } else {
      lastCommit = commits[0];
      lastCommitDate = new Date(
        lastCommit.commit.committer?.date || ''
      ).toISOString();

      // Get committer information if available
      // GitHub API might return null for author if the commit email doesn't match a GitHub account
      if (lastCommit.author) {
        lastCommitterLogin = lastCommit.author.login;
        lastCommitterAvatar = lastCommit.author.avatar_url;
        lastCommitterUrl = lastCommit.author.html_url;
      } else if (lastCommit.committer) {
        // Fallback to committer if author is not available
        lastCommitterLogin = lastCommit.committer.login;
        lastCommitterAvatar = lastCommit.committer.avatar_url;
        lastCommitterUrl = lastCommit.committer.html_url;
      }
    }

    // Check for security vulnerabilities (requires 'security_events' permission)
    const dependabotAlertsResult = await this.requestor.getDependabotAlerts(
      repo.org,
      repo.repo
    );

    let securityNoticesCount = 0;
    let hasVulnerabilities = false;
    let dependabotAlertsCount = 0;

    if (isGitHubRequestorError(dependabotAlertsResult)) {
      console.warn(
        `Failed to fetch dependabot alerts: ${dependabotAlertsResult.errorMessage}`
      );
    } else {
      const securityNotices = dependabotAlertsResult.filter(
        alert => alert.state === 'open' || alert.state === 'dismissed'
      );
      securityNoticesCount = securityNotices.length;
      hasVulnerabilities = securityNotices.length > 0;
      dependabotAlertsCount = dependabotAlertsResult.length;
    }

    // Check if code scanning is enabled
    let codeScanning = false;

    const workflows = await this.requestor.getRepoWorkflows(
      repo.org,
      repo.repo
    );

    if (isGitHubRequestorError(workflows)) {
      console.warn(`Failed to fetch workflows: ${workflows.errorMessage}`);
    } else if (workflows.length > 0) {
      // Check if any workflow contains CodeQL or code scanning
      codeScanning = workflows.some(
        workflow =>
          workflow.name.toLowerCase().includes('codeql') ||
          workflow.name.toLowerCase().includes('code-scanning') ||
          workflow.name.toLowerCase().includes('code scanning')
      );
    }

    // Create the full repository information with the required properties needed by report generators
    return {
      name: retrievedRepo.name,
      org: repo.org,
      repo: repo.repo,
      full_name: `${repo.org}/${repo.repo}`,
      description,
      issues: issuesCount,
      prsCount: prsCount,
      stars,
      forks,
      watchers,
      lastCommitDate,
      lastCommitterLogin,
      lastCommitterAvatar,
      lastCommitterUrl,
      securityNotices: securityNoticesCount,
      hasVulnerabilities: hasVulnerabilities,
      dependabotAlerts: dependabotAlertsCount,
      codeScanning,
      topics,
    };
  }

  async searchRepo(
    query: string,
    limit: number
  ): Promise<SearchRepositoryItem[]> {
    const response = await this.requestor.getSearchRepository(
      query,
      limit,
      'updated',
      'desc'
    );

    if (isGitHubRequestorError(response)) {
      console.error(`Error searching repository: ${response.errorMessage}`);
      return []; // Return empty array to allow reports to continue functioning
    }

    return response;
  }
}
