import { RepositoryItemExtened } from '../models.js';

import ReportGenerator from '../reports/report-generator.js';
import GitHubSearcher from '../github/github-search.js';
import { getConfigData } from '../init/initialize-with-data.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  insertRepository,
  closeDatabase,
  getDateBasedDbFilename,
} from '../db/index.js';

// 1. Get data from GitHub (search for repositories)
async function getSuggestedReposData(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string,
  limit: number
) {
  const collector = new GitHubSearcher(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return { repos: [], configData: null };
  }
  const repos: RepositoryItemExtened[] = await collector.searchOrgRepositories(
    configData.microsoftOrgs,
    configData.microsoftLanguages,
    configData.microsoftTopics,
    limit
  );

  // Sort by stars - add null checking to handle undefined values
  repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

  return { repos, configData };
}

// 2. Insert into database
async function insertSuggestedReposIntoDb(
  repos: RepositoryItemExtened[],
  generatedDirectory: string
) {
  const dbFilename = getDateBasedDbFilename(generatedDirectory);
  console.log(`Creating SQLite database: ${dbFilename}`);

  // Create database connection and initialize schema
  const db = await createDatabaseConnection(dbFilename);
  await initializeDatabase(db);

  // Insert each repository into the database
  for (const repo of repos) {
    await insertRepository(db, repo);
  }

  // Close the database connection
  await closeDatabase(db);
  console.log(
    `Successfully stored ${repos.length} repositories in the database`
  );

  // Add the database info to the repositories for report generation
  return repos.map(repo => ({
    ...repo,
    dbPath: dbFilename,
  }));
}

// 3. Create repo/report
async function createSuggestedReposReport(reposWithDb: any[], configData: any) {
  const mdReport =
    ReportGenerator.generateSuggestedReposMarkdownReport(reposWithDb);

  // Write to file
  await ReportGenerator.saveReport(
    mdReport,
    configData.generatedDirectoryName + '/suggested_repos.md'
  );
}

export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string,
  limit: number
): Promise<void> {
  console.log(`\n\n🔍 ---------------------------------------\nSuggest repos`);
  // 1. Get data from GitHub
  const { repos, configData } = await getSuggestedReposData(
    _token,
    dataDirectory,
    generatedDirectory,
    limit
  );
  if (!configData) return;
  // 2. Insert into database
  let reposWithDb: any[] = [];
  try {
    reposWithDb = await insertSuggestedReposIntoDb(repos, generatedDirectory);
  } catch (error) {
    console.error(`Error storing repository data in database: ${error}`);
    return;
  }
  // 3. Create report
  await createSuggestedReposReport(reposWithDb, configData);
}
