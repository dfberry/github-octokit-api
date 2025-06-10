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
async function getRepoIndexData(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
) {
  const collector = new RepoDataCollector(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return { reposWithData: [], configData: null };
  }
  const repos: SimpleRepository[] = extractOrgAndRepo(
    configData.microsoftRepos
  );
  console.log(`Extracting org and repo data...`);
  const reposWithData: RepoData[] = [];
  for (const repoItem of repos) {
    console.log(`Collecting repo data for ${repoItem.org}/${repoItem.repo}...`);
    const repoData = await collector.collectRepoData(repoItem);
    reposWithData.push(repoData);
  }
  return { reposWithData, configData };
}

// 2. Insert into database (not used for repo-index, but included for structure)
function insertRepoIndexDataIntoDb() {
  // No DB insertions for repo-index
}

// 3. Create repo index report/output
async function createRepoIndexReport(
  reposWithData: RepoData[],
  configData: any
) {
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
}

export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(`\n\n🔍 ---------------------------------------\nRepo index `);
    // 1. Get data from GitHub
    const { reposWithData, configData } = await getRepoIndexData(
      _token,
      dataDirectory,
      generatedDirectory
    );
    if (!configData) return;
    // 2. Insert into database (not used, but for structure)
    insertRepoIndexDataIntoDb();
    // 3. Create report/output
    await createRepoIndexReport(reposWithData, configData);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
