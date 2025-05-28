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
} from '../utils/db.js';

export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string,
  limit: number
): Promise<void> {
  console.log(`\n\n🔍 ---------------------------------------\nSuggest repos`);

  // Initialize data collector
  const collector = new GitHubSearcher(token);

  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  // Search for JavaScript repos
  const repos: RepositoryItemExtened[] = await collector.searchOrgRepositories(
    configData.microsoftOrgs,
    configData.microsoftLanguages,
    configData.microsoftTopics,
    limit
  );

  // Generate report
  console.log(`\n📊 Found ${repos.length} total repositories`);

  // Sort by stars - add null checking to handle undefined values
  repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

  // Store repositories in SQLite database
  const dbFilename = getDateBasedDbFilename(generatedDirectory);
  console.log(`Creating SQLite database: ${dbFilename}`);

  try {
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
    const reposWithDb = repos.map(repo => ({
      ...repo,
      dbPath: dbFilename,
    }));

    // Create markdown report with database info
    const mdReport =
      ReportGenerator.generateSuggestedReposMarkdownReport(reposWithDb);

    // Write to file
    await ReportGenerator.saveReport(
      mdReport,
      configData.generatedDirectoryName + '/suggested_repos.md'
    );
  } catch (error) {
    console.error(`Error storing repository data in database: ${error}`);
  }
}
