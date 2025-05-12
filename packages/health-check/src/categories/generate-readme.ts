import RepoDataCollector from '../github/github-repo.js';
import { RepoData } from '../models.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nGenerate READ.md `
    );

    // Initialize data collector
    const collector = new RepoDataCollector(token);

    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    //const dataFile = process.env.DATA_FILE || 'microsoft-repos.json';

    // // Read microsoft-repos.json
    // const reposJsonPath: string = path.join(process.cwd(), '../../', dataFile);
    // console.log(`Reading JSON list from ${reposJsonPath}`);
    // const reposContent: string = await fs.readFile(reposJsonPath, 'utf8');
    // console.log(`Read ${reposContent.length} characters from `, dataFile);

    // // Extract repositories
    // const reposJson = JSON.parse(reposContent);
    // console.log(`Found ${reposJson.length} repositories in `, dataFile);
    // const repos: Array<{ org: string; repo: string }> =
    //   extractOrgAndRepo(reposJson);

    const repos: SimpleRepository[] = extractOrgAndRepo(
      configData.microsoftRepos
    );
    console.log(`Extract org and repo data ...`);

    // Collect data for each repository using the enhanced collectRepoData
    const reposWithData: RepoData[] = [];
    for (const repoItem of repos) {
      console.log(`Collect repo data ${repoItem.org}/${repoItem.repo}...`);

      // Use collectRepoData to get all repository information at once
      const repoData = await collector.collectRepoData(repoItem);

      // We have all the data we need from collectRepoData - no need to cherry pick
      reposWithData.push(repoData);
    }

    // Generate new README content
    const newReadmeContent = ReportGenerator.generateReadme(reposWithData);

    ReportGenerator.saveReport(
      newReadmeContent,
      configData.generatedDirectoryName + '/README.new.md'
    );

    if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
      console.log('\n--- Report Markdown ---\n');
      console.log(newReadmeContent);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
