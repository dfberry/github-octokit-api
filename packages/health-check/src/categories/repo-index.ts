import {
  createDatabaseConnection,
  closeDatabase,
  getDateBasedDbFilename,
} from '../db/index.js';
import { RepoData } from '../models.js';
import { GET_REPOSITORIES } from '../db/sql-all.js';
import ReportGenerator from '../reports/report-generator.js';
import type { DataConfig } from '../init/initialize-with-data.js';
import { getAllRepositoryIDs } from '../db/queries.js';
import GitHubRequestor from '../github/github.js';
import { flattenObjectValues } from '../utils/json.js';

// 3. Create repo index report/output
async function createRepoIndexReport(
  reposWithData: RepoData[],
  configData: DataConfig
) {
  // Generate repo index content
  const repoIndexContent = ReportGenerator.generateRepoIndex(reposWithData);

  const reportFileName = configData.generatedDirectoryName + '/repositories.md';

  // Save the repo index
  await ReportGenerator.saveReport(repoIndexContent, reportFileName);
  if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
    console.log('\n--- Repository Index Markdown ---\n');
    console.log(repoIndexContent);
  }
}

export default async function run(
  _token: string,
  generatedDirectory: string,
  configData: DataConfig
): Promise<void> {
  let db: import('sqlite3').Database | undefined;

  try {
    console.log(`\n\n🔍 ---------------------------------------\nRepo index `);

    // 1. Read from database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    db = await createDatabaseConnection(dbFilename);
    const dbConn = db!; // Type assertion: db is defined
    // Query all contributor activity
    const repoRows: any[] = await new Promise((resolve, reject) => {
      dbConn.all(GET_REPOSITORIES, [], (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    await closeDatabase(dbConn);

    await createRepoIndexReport(repoRows, configData);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export async function repoExtraData(
  _token: string,
  generatedDirectory: string,
  configData: DataConfig
): Promise<void> {
  let db: import('sqlite3').Database | undefined;

  try {
    console.log(`\n\n🔍 ---------------------------------------\nRepo index `);

    console.log(configData.dataDirectoryName);

    //const fullRepos: any[] = [];

    // 1. Read from database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    db = await createDatabaseConnection(dbFilename);
    const dbConn = db!; // Type assertion: db is defined
    // Query all contributor activity

    const repos = await getAllRepositoryIDs(dbConn);
    if (repos.length === 0) {
      console.log('No repositories found in the database.');
    }
    const fullNames: string[] = flattenObjectValues(repos, 'full_name');
    const githubRequestor = new GitHubRequestor(_token);

    for (const repo of fullNames) {
      console.log(`Processing repository: ${repo}`);
      // query for each repo
      // 1. get topics

      const [owner, repoName] = repo.split('/');

      await githubRequestor.getRepoExtra(owner, repoName);

      // 1. get readme
      //const readmeResult = await githubRequestor.getRepoReadme(repo);
      // 2. get security notices
      // 3. get dependabot alerts
      // 4. get code scanning alerts

      //fullRepos.push(result);
    }

    await closeDatabase(dbConn);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
