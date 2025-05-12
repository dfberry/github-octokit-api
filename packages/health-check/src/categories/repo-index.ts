import RepoDataCollector from '../github/github-repo.js';
import { RepoData } from '../models.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

/**
 * Run repo index generation
 * @param token GitHub token
 * @param dataDirectory Directory for input data
 * @param generatedDirectory Directory for output data
 */
export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nGenerating Repository Index`
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
    console.log(`Extracting org and repo data...`);

    // Collect data for each repository
    const reposWithData: RepoData[] = [];
    for (const repoItem of repos) {
      console.log(
        `Collecting repo data for ${repoItem.org}/${repoItem.repo}...`
      );

      // Use collectRepoData to get all repository information
      const repoData = await collector.collectRepoData(repoItem);
      reposWithData.push(repoData);
    }

    // Sort repositories alphabetically by name
    reposWithData.sort((a, b) => {
      const nameA = a.name || a.full_name || '';
      const nameB = b.name || b.full_name || '';
      return nameA.localeCompare(nameB);
    });

    // Generate repo index content
    const repoIndexContent = ReportGenerator.generateRepoIndex(reposWithData);

    // Save the repo index
    await ReportGenerator.saveReport(
      repoIndexContent,
      configData.generatedDirectoryName + '/repo-index.md'
    );

    if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
      console.log('\n--- Repository Index Markdown ---\n');
      console.log(repoIndexContent);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
