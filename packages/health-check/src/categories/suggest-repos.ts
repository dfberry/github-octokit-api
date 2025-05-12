import { RepositoryItemExtened } from '../models.js';
import ReportGenerator from '../reports/report-generator.js';
import GitHubSearcher from '../github/github-search.js';
import { getConfigData } from '../init/initialize-with-data.js';

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

  // Create markdown report - fix the method name spelling
  const mdReport = ReportGenerator.generateSuggestedReposMarkdownReport(repos);

  // Write to file
  ReportGenerator.saveReport(
    mdReport,
    configData.generatedDirectoryName + '/suggested_repos.md'
  );
}
