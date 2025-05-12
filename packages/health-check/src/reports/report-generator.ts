import { promises as fs } from 'fs';
import { RepositoryItemExtened, RepoData, PrSearchItem } from '../models.js';
import { getProcessDate } from '../utils/dates.js';

export default class ReportGenerator {
  static async saveReport(markdown: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, markdown);
    console.log(`Health check report generated successfully to ${filePath}`);
  }

  static generateHealthCheckMarkdownReport(repoDataList: RepoData[]): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });

    let markdown: string = '# Repository Health Check Report\n\n';
    markdown += `*Generated on: ${formattedDate}*\n\n`;

    // Main repository stats table
    markdown += '## Repository Statistics\n\n';
    markdown +=
      '| Repository | Issues | PRs | Stars | Forks | Watchers | Last Commit | Last Committer |\n';
    markdown +=
      '|------------|--------|-----|-------|-------|----------|-------------|---------------|\n';

    for (const data of repoDataList) {
      // Using safe property access with fallback values
      const repoName =
        data.name ||
        data?.org + (data?.repo ?? '') ||
        data.full_name ||
        data.description.split(' ')[0] ||
        'Unknown';
      const org =
        data.org || data.topics.includes('microsoft') ? 'microsoft' : 'azure';
      const repo = data.repo || repoName.toLowerCase();

      const committerCell = data.lastCommitterLogin
        ? `[![${data.lastCommitterLogin}](${data.lastCommitterAvatar}&s=20)](${data.lastCommitterUrl})`
        : '';

      const lastCommitDate = data.lastCommitDate
        ? new Date(data.lastCommitDate).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : 'N/A or 404';

      markdown += `| [${repoName}](https://github.com/${org}/${repo}) |  ${data.issues} | ${data.prsCount} | ${data.stars} | ${data.forks} | ${data.watchers} | ${lastCommitDate} | ${committerCell} |\n`;
    }

    // Security section
    markdown += '\n\n## Security Status\n\n';
    markdown +=
      '| Repository | Security Notices | Dependabot | Code Scanning | Status |\n';
    markdown +=
      '|------------|-----------------|-----------|--------------|--------|\n';

    for (const data of repoDataList) {
      // Using safe property access with fallback values
      const repoName = data.name || data.description.split(' ')[0] || 'Unknown';
      const org =
        data.org || data.topics.includes('microsoft') ? 'microsoft' : 'azure';
      const repo = data.repo || repoName.toLowerCase();

      const securityStatus = data.hasVulnerabilities
        ? '⚠️ Issues'
        : data.dependabotAlerts === 0 && !data.codeScanning
          ? '⚠️ No protections'
          : '✅ Good';

      const dependabotIcon = data.dependabotAlerts >= 0 ? '✅' : '❌';
      const codeScanningIcon = data.codeScanning ? '✅' : '❌';

      markdown += `| [${repoName}](https://github.com/${org}/${repo}) | ${data.securityNotices} | ${dependabotIcon} | ${codeScanningIcon} | ${securityStatus} |\n`;
    }

    return markdown;
  }

  static generateSuggestedReposMarkdownReport(
    repositories: RepositoryItemExtened[],
    limit: number = 100
  ): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });
    let newReadmeReferences: string = '';

    // sort by org then repo name
    repositories.sort((a, b) => {
      const orgA = a.org || '';
      const orgB = b.org || '';
      const repoA = a.repo || '';
      const repoB = b.repo || '';

      if (orgA < orgB) return -1;
      if (orgA > orgB) return 1;
      if (repoA < repoB) return -1;
      if (repoA > repoB) return 1;
      return 0;
    });

    let markdown = `# Suggested Azure JavaScript/TypeScript Repositories\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `Found ${repositories.length} repositories updated in the last 3 months.\n\n`;

    markdown += `## Top Repositories\n\n`;
    markdown += `| Repository | Description | Stars | Last Commit | Status | Topics |\n`;
    markdown += `| ---------- | ----------- | ----: | ----------- | :----: | ------ |\n`;

    // Display top N repos
    const topRepos = repositories.slice(0, limit);

    for (const repo of topRepos) {
      // Format topics
      const topics = repo?.topics?.join(', ') || '';

      // Status indicator (archived or active)
      const status = repo?.archived ? '📦 Archived' : '✅ Active';

      const repoMarker = `${repo?.org}-${repo?.repo}`;

      // Add row to table
      markdown += `| [${repoMarker}][${repoMarker}] | ${repo.description} | ${repo.stargazers_count || 0} | ${repo.last_commit_date || 'N/A'} | ${status} | ${topics} |\n`;

      newReadmeReferences += `[${repoMarker}]: https://github.com/${repo.org}/${repo.repo}\n`;
    }

    markdown += `\n## How to Add to README\n\n`;
    markdown += `To add any of these repositories to the main README.md, use the following markdown format:\n\n`;

    markdown += '```markdown\n';
    markdown +=
      '| [repo-name][repo-link] | [Service Name][service-doc-link] | ✅/- | ✅/- | ✅/- |\n\n';
    markdown += '<!-- Reference Links -->\n';
    markdown += '[repo-link]: https://github.com/org/repo-name\n';
    markdown +=
      '[service-doc-link]: https://learn.microsoft.com/azure/service-name/\n';
    markdown += '```\n';

    markdown += newReadmeReferences;

    return markdown;
  }

  static generateReadme(reposWithData: RepoData[]): string {
    let newReadme: string = '';
    let newReadmeReferences: string = '';

    // Add the table header with the new Topics column
    newReadme += '| Sample | Description | Topics | Stats |\n';
    newReadme += '| ------ | ----------- | ------ | ----- |\n';

    // Add each repository with its data
    for (const repo of reposWithData) {
      // Generate a display name from description if name is not available
      const repoName =
        repo?.name || repo?.description.split(' ')[0] || 'Unknown';
      const orgName = repo?.org || 'github'; // Default to 'github' if org not specified
      const repoSlug = repo?.repo || repoName.toLowerCase().replace(/\s/g, '-');

      // Format repository stats without using pipe characters
      const stats = `⭐ ${repo?.stars} <br> 👀 ${repo?.watchers} <br> 🔄 ${repo?.lastCommitDate}`;

      // Format topics as badges
      const topicsFormatted =
        Array.isArray(repo?.topics) && repo?.topics?.length > 0
          ? repo?.topics?.map(topic => `\`${topic}\``).join(' ')
          : '-';

      // Add the row to the table
      newReadme += `| [${repoName}][${repoName.toLowerCase().replace(/\s/g, '-')}] | ${repo?.description} | ${topicsFormatted} | ${stats} |\n`;

      newReadmeReferences += `[${repoName.toLowerCase().replace(/\s/g, '-')}]: ${'https://github.com/' + orgName + '/' + repoSlug}\n`;
    }
    return newReadme + `\n\n` + newReadmeReferences;
  }

  static generateContributorActivityReport(prItems: PrSearchItem[]): string {
    const formattedDate = getProcessDate();

    let markdown = `# Contributor Repository Activity\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report shows Azure contributions to sample repositories over the last 30 days.\n\n`;

    // Group PRs by contributor
    const contributorMap = new Map<string, PrSearchItem[]>();

    for (const pr of prItems) {
      const contributor = pr.user?.login || 'anonymous';
      if (!contributorMap.has(contributor)) {
        contributorMap.set(contributor, []);
      }
      contributorMap.get(contributor)?.push(pr);
    }

    // Sort contributors alphabetically
    const sortedContributors = Array.from(contributorMap.keys()).sort();

    // For each contributor, create a section
    for (const contributor of sortedContributors) {
      const contributorPRs = contributorMap.get(contributor) || [];

      markdown += `## Contributor: [${contributor}](${contributorPRs[0]?.user?.html_url || '#'})\n\n`;

      // Group PRs by repository
      const repoMap = new Map<string, PrSearchItem[]>();

      for (const pr of contributorPRs) {
        const repoFullName = pr.repository_url.replace(
          'https://api.github.com/repos/',
          ''
        );
        if (!repoMap.has(repoFullName)) {
          repoMap.set(repoFullName, []);
        }
        repoMap.get(repoFullName)?.push(pr);
      }

      // Sort repositories alphabetically
      const sortedRepos = Array.from(repoMap.keys()).sort();

      // Create a table for this contributor
      markdown += `| Repository | PR Title | Status | Created | Updated |\n`;
      markdown += `|------------|----------|--------|---------|--------|\n`;

      for (const repoName of sortedRepos) {
        const repoPRs = repoMap.get(repoName) || [];

        // Sort PRs by creation date (newest first)
        repoPRs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        for (const pr of repoPRs) {
          const status = pr.state === 'open' ? '🔄 Open' : '✅ Closed';
          const createdDate = new Date(pr.created_at).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }
          );

          const updatedDate = new Date(pr.updated_at).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
            }
          );

          markdown += `| [${repoName}](${pr.repository_url.replace('api.github.com/repos', 'github.com')}) | [${pr.title}](${pr.html_url}) | ${status} | ${createdDate} | ${updatedDate} |\n`;
        }
      }

      markdown += `\nTotal PRs by ${contributor}: ${contributorPRs.length}\n\n`;
    }

    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `Total Contributors: ${sortedContributors.length}\n`;
    markdown += `Total PRs: ${prItems.length}\n\n`;

    return markdown;
  }

  /**
   * Generate a report for GitHub Actions workflows across repositories
   * @param repoWorkflowDataList List of repositories with their workflows
   * @returns Markdown formatted report
   */
  static generateWorkflowsReport(
    repoWorkflowDataList: {
      org: string;
      repo: string;
      full_name: string;
      workflows: {
        id: number;
        name: string;
        path: string;
        state: string;
        latestRun: {
          id: number;
          status: string | null;
          conclusion: string | null;
          createdAt: string;
          updatedAt: string;
          htmlUrl: string;
        } | null;
      }[];
    }[]
  ): string {
    const timestamp = new Date().toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });

    let markdown = `# GitHub Actions Workflows Report\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report shows GitHub Actions workflows for repositories and their current status.\n\n`;

    // Summary section
    markdown += `## Summary\n\n`;

    let totalWorkflows = 0;
    let activeWorkflows = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let pendingRuns = 0;

    // Count workflows and their status
    for (const repo of repoWorkflowDataList) {
      totalWorkflows += repo.workflows.length;

      for (const workflow of repo.workflows) {
        if (workflow.state === 'active') {
          activeWorkflows++;
        }

        if (workflow.latestRun) {
          if (workflow.latestRun.conclusion === 'success') {
            successfulRuns++;
          } else if (workflow.latestRun.conclusion === 'failure') {
            failedRuns++;
          } else if (
            workflow.latestRun.status === 'queued' ||
            workflow.latestRun.status === 'in_progress'
          ) {
            pendingRuns++;
          }
        }
      }
    }

    markdown += `- Total Repositories: ${repoWorkflowDataList.length}\n`;
    markdown += `- Total Workflows: ${totalWorkflows}\n`;
    markdown += `- Active Workflows: ${activeWorkflows}\n`;
    markdown += `- Successful Runs: ${successfulRuns}\n`;
    markdown += `- Failed Runs: ${failedRuns}\n`;
    markdown += `- Pending Runs: ${pendingRuns}\n\n`;

    // For each repository, create a section with its workflows
    for (const repo of repoWorkflowDataList) {
      markdown += `## Repository: [${repo.full_name}](https://github.com/${repo.full_name})\n\n`;

      if (repo.workflows.length === 0) {
        markdown += `*No workflows found for this repository*\n\n`;
        continue;
      }

      markdown += `| Workflow | Status | Last Run | Conclusion | Last Updated |\n`;
      markdown += `|---------|--------|----------|------------|-------------|\n`;

      // Sort workflows by name
      const sortedWorkflows = [...repo.workflows].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      for (const workflow of sortedWorkflows) {
        const workflowName = workflow.name;
        const workflowPath = workflow.path;
        const workflowState = workflow.state;

        // Format status with appropriate icon
        let statusIcon = '';
        if (workflowState === 'active') {
          statusIcon = '✅ Active';
        } else if (workflowState === 'disabled_manually') {
          statusIcon = '⚠️ Disabled';
        } else if (workflowState === 'disabled_inactivity') {
          statusIcon = '⚠️ Disabled (inactive)';
        } else {
          statusIcon = '❓ ' + workflowState;
        }

        let runStatus = 'No runs';
        let conclusion = '-';
        let lastUpdated = '-';
        let runUrl = '';

        if (workflow.latestRun) {
          runStatus = workflow.latestRun.status || 'unknown';
          conclusion = workflow.latestRun.conclusion || 'pending';
          lastUpdated = new Date(
            workflow.latestRun.updatedAt
          ).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          });
          runUrl = workflow.latestRun.htmlUrl;

          // Format conclusion with appropriate icon
          if (conclusion === 'success') {
            conclusion = '✅ Success';
          } else if (conclusion === 'failure') {
            conclusion = '❌ Failure';
          } else if (conclusion === 'cancelled') {
            conclusion = '⚠️ Cancelled';
          } else if (conclusion === 'skipped') {
            conclusion = '⏭️ Skipped';
          } else if (conclusion === 'pending' || conclusion === 'in_progress') {
            conclusion = '🔄 In Progress';
          }
        }

        const workflowUrl = `https://github.com/${repo.full_name}/blob/main/${workflowPath}`;
        const workflowLinkWithTooltip = `[${workflowName}](${workflowUrl} "${workflowPath}")`;

        if (runUrl) {
          runStatus = `[${runStatus}](${runUrl})`;
        }

        markdown += `| ${workflowLinkWithTooltip} | ${statusIcon} | ${runStatus} | ${conclusion} | ${lastUpdated} |\n`;
      }

      markdown += `\n`;
    }

    return markdown;
  }
}
