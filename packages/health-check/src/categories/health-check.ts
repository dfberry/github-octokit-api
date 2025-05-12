import RepoDataCollector from '../github/github-repo.js';
import ReportGenerator from '../reports/report-generator.js';

import { RepoData } from '../models.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nHealth check `
    );

    // Initialize data collector
    const collector = new RepoDataCollector(token);

    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    const repos: SimpleRepository[] = extractOrgAndRepo(
      configData.microsoftRepos
    );
    console.log(`Extract org and repo data ...`);

    // Collect data for each repository
    const repoDataList: RepoData[] = [];
    for (const repo of repos) {
      //console.log(JSON.stringify(repo));

      // Using a simple object with required properties
      // This is sufficient for collectRepoData's needs
      console.log(`Run ${repo.org}/${repo.repo}...`);
      const repoData = await collector.collectRepoData({
        org: repo.org,
        repo: repo.repo,
      });
      repoDataList.push({ ...repoData });
    }

    // Generate report
    const markdown =
      ReportGenerator.generateHealthCheckMarkdownReport(repoDataList);

    // Save report
    ReportGenerator.saveReport(
      markdown,
      configData.generatedDirectoryName + '/health.md'
    );

    if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
      console.log('\n--- Report Markdown ---\n');
      console.log(markdown);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// run(token).catch(error => {
//   console.error('Error running health check:', error);
//   process.exit(1);
// });
