import { promises as fs } from 'fs';
import path from 'path';
import {
  RepositoryItemExtened,
  RepoData,
  InfrastructureData,
  ContributorData,
} from '../models.js';
import { getProcessDate, formatDate } from '../utils/dates.js';

export default class ReportGenerator {
  static async saveReport(markdown: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, markdown);
    console.log(`Health check report generated successfully to ${filePath}`);
  }

  static generateHealthCheckMarkdownReport(repoDataList: RepoData[]): string {
    const formattedDate = getProcessDate();

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
        ? formatDate(data.lastCommitDate)
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
    const formattedDate = getProcessDate();
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

    // Add database information if available
    const dbPath =
      repositories.length > 0 && (repositories[0] as any).dbPath
        ? (repositories[0] as any).dbPath
        : null;

    if (dbPath) {
      markdown += `Repository data stored in SQLite database: \`${path.relative(process.cwd(), dbPath)}\`\n\n`;
    }

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

      // Format the last commit date using formatDate
      const lastCommitDate = repo.last_commit_date
        ? formatDate(repo.last_commit_date)
        : 'N/A';

      // Add row to table
      markdown += `| [${repoMarker}][${repoMarker}] | ${repo.description} | ${repo.stargazers_count || 0} | ${lastCommitDate} | ${status} | ${topics} |\n`;

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

    if (dbPath) {
      markdown += `\n## Database Information\n\n`;
      markdown += `All repository data is stored in a SQLite database. You can query it using standard SQL commands.\n\n`;
      markdown += `**Database path:** \`${dbPath}\`\n\n`;
      markdown += `**Example query:**\n\n`;
      markdown += '```sql\n';
      markdown +=
        'SELECT org, repo, stars, topics, status FROM repositories ORDER BY stars DESC LIMIT 10;\n';
      markdown += '```\n\n';
      markdown += '**Schema:**\n\n';
      markdown += '```\n';
      markdown += 'CREATE TABLE repositories (\n';
      markdown += '  id TEXT PRIMARY KEY,\n';
      markdown += '  org TEXT NOT NULL,\n';
      markdown += '  repo TEXT NOT NULL,\n';
      markdown += '  full_name TEXT,\n';
      markdown += '  description TEXT,\n';
      markdown += '  stars INTEGER DEFAULT 0,\n';
      markdown += '  forks INTEGER DEFAULT 0,\n';
      markdown += '  watchers INTEGER DEFAULT 0,\n';
      markdown += '  issues INTEGER DEFAULT 0,\n';
      markdown += '  pulls INTEGER DEFAULT 0,\n';
      markdown += '  last_commit_date TEXT,\n';
      markdown += '  archived INTEGER DEFAULT 0,\n';
      markdown += '  topics TEXT,\n';
      markdown += '  status TEXT,\n';
      markdown += '  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP\n';
      markdown += ')\n';
      markdown += '```\n';
    }

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
      const formattedLastCommitDate = repo?.lastCommitDate
        ? formatDate(repo?.lastCommitDate)
        : 'N/A';
      const stats = `⭐ ${repo?.stars} <br> 👀 ${repo?.watchers} <br> 🔄 ${formattedLastCommitDate}`;

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

  static generateContributorActivityReport(activityRows: any[]): string {
    const formattedDate = getProcessDate();

    let markdown = `# Contributor Repository Activity\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report shows Azure contributions to sample repositories over the last 30 days.\n\n`;

    // Group by contributor, then by repo
    const contributorMap = new Map<string, Map<string, any[]>>();
    for (const row of activityRows) {
      const contributor = row.login;
      const repo = row.repo_id;
      if (!contributorMap.has(contributor)) {
        contributorMap.set(contributor, new Map());
      }
      const repoMap = contributorMap.get(contributor)!;
      if (!repoMap.has(repo)) {
        repoMap.set(repo, []);
      }
      repoMap.get(repo)!.push(row);
    }

    // Sort contributors alphabetically
    const sortedContributors = Array.from(contributorMap.keys()).sort();

    for (const contributor of sortedContributors) {
      const repoMap = contributorMap.get(contributor)!;
      // Add a bookmark anchor for this contributor (for linking from the index)
      markdown += `<a id=\"${contributor.toLowerCase()}\"></a>\n`;
      // Link back to contributor index
      markdown += `[← View Profile](contributor-index.md#${contributor.toLowerCase()})\n\n`;
      markdown += `## Contributor: [${contributor}](https://github.com/${contributor})\n\n`;
      // Table header
      markdown += `| Repository | PR/Issue | Title | Status | Created | Updated | Closed |\n`;
      markdown += `|------------|----------|-------|--------|---------|--------|--------|\n`;
      // For each repo
      const sortedRepos = Array.from(repoMap.keys()).sort();
      let prCount = 0;
      for (const repo of sortedRepos) {
        const items = repoMap.get(repo)!;
        for (const item of items) {
          if (!item.item_type) continue; // skip if no PR/issue
          const isPR = item.item_type === 'pr';
          const status = item.item_state === 'open' ? '🔄 Open' : '✅ Closed';
          const created = item.item_created_at
            ? formatDate(item.item_created_at)
            : '';
          const updated = item.item_updated_at
            ? formatDate(item.item_updated_at)
            : '';
          const closed = item.item_closed_at
            ? formatDate(item.item_closed_at)
            : '';
          const title = item.item_title || '';
          const url = item.item_url || '';
          const typeLabel = isPR ? 'PR' : 'Issue';
          if (isPR) prCount++;
          markdown += `| [${repo}](https://github.com/${repo}) | ${typeLabel} | [${title}](${url}) | ${status} | ${created} | ${updated} | ${closed} |\n`;
        }
      }
      markdown += `\nTotal PRs by ${contributor}: ${prCount}\n\n`;
    }

    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `Total Contributors: ${sortedContributors.length}\n`;
    markdown += `Total PRs: ${activityRows.filter(r => r.item_type === 'pr').length}\n\n`;

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
    const formattedDate = getProcessDate();

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
          lastUpdated = formatDate(workflow.latestRun.updatedAt);
          runUrl = workflow.latestRun.htmlUrl;

          // Format conclusion with appropriate icon
          if (conclusion === 'success') {
            conclusion = '✅ Success';
          } else if (conclusion === 'failure') {
            conclusion = '❌ Failure';
          } else if (conclusion === 'cancelled') {
            conclusion = '⚠️ Cancelled';
          } else {
            conclusion = '❓ ' + conclusion;
          }
        }

        markdown += `| [${workflowName}](${runUrl}) | ${statusIcon} | ${runStatus} | ${conclusion} | ${lastUpdated} |\n`;
      }

      markdown += `\n`;
    }

    return markdown;
  }

  /**
   * Generate a report for infrastructure across repositories
   * @param infraDataList List of infrastructure data for repositories
   * @returns Markdown formatted report
   */
  static generateInfrastructureReport(
    infraDataList: InfrastructureData[]
  ): string {
    const formattedDate = getProcessDate();

    let markdown = `# Repository Infrastructure Report\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report shows infrastructure details for repositories, including infrastructure folders, types, and Azure Developer CLI configuration.\n\n`;

    // Summary section
    markdown += `## Summary\n\n`;

    let totalRepos = infraDataList.length;
    let reposWithInfra = 0;
    let reposWithBicep = 0;
    let reposWithTerraform = 0;
    let reposWithArm = 0;
    let reposWithOther = 0;
    let reposWithAzureYaml = 0;

    // Count infrastructure types
    for (const infra of infraDataList) {
      if (infra.hasInfrastructure) {
        reposWithInfra++;
      }

      if (infra.infrastructureType.includes('bicep')) {
        reposWithBicep++;
      }

      if (infra.infrastructureType.includes('terraform')) {
        reposWithTerraform++;
      }

      if (infra.infrastructureType.includes('arm')) {
        reposWithArm++;
      }

      if (infra.infrastructureType.includes('other')) {
        reposWithOther++;
      }

      if (infra.hasAzureYaml) {
        reposWithAzureYaml++;
      }
    }

    markdown += `- Total Repositories: ${totalRepos}\n`;
    markdown += `- Repositories with Infrastructure: ${reposWithInfra} (${Math.round((reposWithInfra / totalRepos) * 100)}%)\n`;
    markdown += `- Repositories with Bicep: ${reposWithBicep}\n`;
    markdown += `- Repositories with Terraform: ${reposWithTerraform}\n`;
    markdown += `- Repositories with ARM Templates: ${reposWithArm}\n`;
    markdown += `- Repositories with Azure Developer CLI (azure.yaml): ${reposWithAzureYaml}\n\n`;

    // Main table with infrastructure details
    markdown += `## Repository Infrastructure Details\n\n`;
    markdown += `| Repository | Has Infrastructure | Infrastructure Types | Azure Developer CLI | Infrastructure Folders |\n`;
    markdown += `|------------|-------------------|---------------------|---------------------|-------------------------|\n`;

    // Sort repositories alphabetically
    const sortedInfra = [...infraDataList].sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );

    for (const infra of sortedInfra) {
      const repoName = infra.full_name;
      const repoLink = `https://github.com/${infra.full_name}`;

      // Format infrastructure types
      const infraTypes =
        infra.infrastructureType.length > 0
          ? infra.infrastructureType.join(', ')
          : 'None';

      // Format Azure Developer CLI
      const azureDevCli = infra.hasAzureYaml
        ? `✅ [azure.yaml](${repoLink}/blob/main/${infra.azureYamlPath})`
        : '❌ Not found';

      // Format infrastructure folders
      const infraFolders =
        infra.infrastructureFolders.length > 0
          ? infra.infrastructureFolders
              .map(folder => {
                const path = folder.path === 'root' ? '/' : `/${folder.path}`;
                return `- ${folder.type}: ${path} (${folder.fileCount} ${folder.fileCount === 1 ? 'file' : 'files'})`;
              })
              .join('<br>')
          : 'None';

      const hasInfra = infra.hasInfrastructure ? '✅ Yes' : '❌ No';

      markdown += `| [${repoName}](${repoLink}) | ${hasInfra} | ${infraTypes} | ${azureDevCli} | ${infraFolders} |\n`;
    }

    return markdown;
  }

  /**
   * Generate a markdown report for the contributor index
   * Provides detailed information about each contributor profile
   */
  static generateContributorIndexReport(
    contributorDataList: ContributorData[]
  ): string {
    const formattedDate = getProcessDate();

    let markdown = `# Microsoft Contributor Index\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This report provides information about Microsoft contributors.\n\n`;
    markdown += `## Contributors\n\n`;

    // Sort contributors alphabetically by login
    contributorDataList.sort((a, b) => a.login.localeCompare(b.login));

    // Create a table of contents for easy navigation
    markdown += '### Quick Navigation\n\n';
    for (const contributor of contributorDataList) {
      markdown += `- [${contributor.name || contributor.login}](#${contributor.login.toLowerCase()})\n`;
    }
    markdown += '\n';

    // Generate detailed sections for each contributor
    for (const contributor of contributorDataList) {
      markdown += `<a id="${contributor.login.toLowerCase()}"></a>\n`;
      markdown += `## ${contributor.name || contributor.login}\n\n`;

      // Link to activity report
      markdown += `[View Activity →](contributor-activity.md#${contributor.login.toLowerCase()})\n\n`;

      // Profile information with avatar
      markdown += `<img src="${contributor.avatarUrl}" width="100" height="100" style="border-radius: 50%" align="left" hspace="10" />\n\n`;
      markdown += `**GitHub**: [@${contributor.login}](https://github.com/${contributor.login})`;

      if (contributor.twitter) {
        markdown += ` | **Twitter**: [@${contributor.twitter}](https://twitter.com/${contributor.twitter})`;
      }

      markdown += `\n\n`;

      if (contributor.company) {
        markdown += `**Company**: ${contributor.company}\n\n`;
      }

      if (contributor.location) {
        markdown += `**Location**: ${contributor.location}\n\n`;
      }

      if (contributor.bio) {
        markdown += `**Bio**: ${contributor.bio}\n\n`;
      }

      if (contributor.blog) {
        const blogUrl = contributor.blog.startsWith('http')
          ? contributor.blog
          : `https://${contributor.blog}`;
        markdown += `**Blog**: [${contributor.blog}](${blogUrl})\n\n`;
      }

      markdown += `**GitHub Stats**: ${contributor.publicRepos} public repositories | ${contributor.followers} followers | Following ${contributor.following}\n\n`;

      // Clear the floating avatar
      markdown += `<div style="clear: both"></div>\n\n`;

      markdown += `---\n\n`;
    }

    // Summary statistics
    markdown += `## Summary\n\n`;
    markdown += `Total Contributors: ${contributorDataList.length}\n`;

    return markdown;
  }

  /**
   * Generate a repository index with H2 headings that can be used as bookmarks
   * @param reposWithData List of repositories with their data
   * @returns Markdown formatted index
   */
  static generateRepoIndex(reposWithData: RepoData[]): string {
    const formattedDate = getProcessDate();

    let markdown = `# Repository Index\n\n`;
    markdown += `*Generated on: ${formattedDate}*\n\n`;
    markdown += `This index provides an alphabetical listing of all repositories with details and links. Each repository name is an H2 heading that can be used as a bookmark target from other markdown files.\n\n`;

    // Table of Contents
    markdown += `## Table of Contents\n\n`;

    for (const repo of reposWithData) {
      const repoName =
        repo?.name || repo?.full_name?.split('/')[1] || 'Unknown';
      markdown += `- [${repoName}](#${repoName
        .toLowerCase()
        .replace(/\s/g, '-')
        .replace(/[^\w-]/g, '')})\n`;
    }

    markdown += `\n## Repository Details\n\n`;

    // Add each repository with detailed information
    for (const repo of reposWithData) {
      const repoName =
        repo?.name || repo?.full_name?.split('/')[1] || 'Unknown';
      const orgName = repo?.org || repo?.full_name?.split('/')[0] || 'github';
      const repoSlug = repo?.repo || repoName.toLowerCase().replace(/\s/g, '-');

      // Use H2 for repository names to make them linkable bookmarks
      markdown += `## ${repoName}\n\n`;

      // Repository details
      markdown += `**Repository:** [${orgName}/${repoSlug}](https://github.com/${orgName}/${repoSlug})\n\n`;
      markdown += `**Description:** ${repo?.description || 'No description available'}\n\n`;

      // Stats in a small table
      markdown += `| Stat | Value |\n`;
      markdown += `| ---- | ----- |\n`;
      markdown += `| Stars | ${repo?.stars || 0} |\n`;
      markdown += `| Forks | ${repo?.forks || 0} |\n`;
      markdown += `| Open Issues | ${repo?.issues || 0} |\n`;
      markdown += `| Pull Requests | ${repo?.prsCount || 0} |\n`;
      markdown += `| Watchers | ${repo?.watchers || 0} |\n`;
      markdown += `| Last Updated | ${repo?.lastCommitDate ? formatDate(repo?.lastCommitDate) : 'N/A'} |\n`;

      // Topics as badges
      if (Array.isArray(repo?.topics) && repo?.topics?.length > 0) {
        markdown += `\n**Topics:** ${repo?.topics?.map(topic => `\`${topic}\``).join(' ')}\n\n`;
      }

      // Security information
      markdown += `\n**Security Status:**\n\n`;
      const securityStatus = repo?.hasVulnerabilities
        ? '⚠️ Has vulnerabilities'
        : repo?.dependabotAlerts === 0 && !repo?.codeScanning
          ? '⚠️ No protections'
          : '✅ Good';

      markdown += `- ${securityStatus}\n`;
      markdown += `- Dependabot: ${repo?.dependabotAlerts >= 0 ? '✅ Enabled' : '❌ Not enabled'}\n`;
      markdown += `- Code Scanning: ${repo?.codeScanning ? '✅ Enabled' : '❌ Not enabled'}\n`;

      markdown += `\n---\n\n`;
    }

    return markdown;
  }
}
