import RepoDataCollector from '../github/github-repo.js';
import { RepoData } from '../models.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nGenerate READ.md `
    );

    // 1. Get data from GitHub (collect repo data)
    const reposWithData = await getRepoDataFromGitHub(
      _token,
      dataDirectory,
      generatedDirectory
    );

    // 2. Create and save the README report
    await createReadmeReport(reposWithData, generatedDirectory);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function getRepoDataFromGitHub(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<RepoData[]> {
  const collector = new RepoDataCollector(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return [];
  }
  const repos: SimpleRepository[] = extractOrgAndRepo(
    configData.microsoftRepos
  );
  console.log(`Extract org and repo data ...`);
  const reposWithData: RepoData[] = [];
  for (const repoItem of repos) {
    console.log(`Collect repo data ${repoItem.org}/${repoItem.repo}...`);
    const repoData = await collector.collectRepoData(repoItem);
    reposWithData.push(repoData);
  }
  return reposWithData;
}

async function createReadmeReport(
  reposWithData: RepoData[],
  generatedDirectory: string
) {
  const newReadmeContent = ReportGenerator.generateReadme(reposWithData);
  const outputPath = generatedDirectory + '/README.md';
  ReportGenerator.saveReport(newReadmeContent, outputPath);
  if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
    console.log('\n--- Report Markdown ---\n');
    console.log(newReadmeContent);
  }
}
