import { InfrastructureData } from '../models.js';
import GitHubInfrastructure from '../github/github-infrastructure.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { extractOrgAndRepo } from '../utils/regex.js';

/**
 * Interface for repository infrastructure data
 */

/**
 * Generate infrastructure report for repositories
 */
export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nInfrastructure report`
    );

    // Initialize infrastructure collector
    const infraCollector = new GitHubInfrastructure(token);

    // Get configuration data
    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    // Extract repository information from configuration
    const repos = extractOrgAndRepo(configData.microsoftRepos);
    console.log(
      `Extracted ${repos.length} repositories for infrastructure analysis...`
    );

    // Collect infrastructure data for each repository
    const infraDataList: InfrastructureData[] = [];
    for (const repo of repos) {
      console.log(`Analyzing infrastructure for ${repo.org}/${repo.repo}...`);

      // Collect infrastructure data
      const infraData = await infraCollector.collectInfrastructureData(
        repo.org,
        repo.repo
      );

      infraDataList.push(infraData);
    }

    // Generate infrastructure report
    console.log(
      `Generating infrastructure report for ${infraDataList.length} repositories...`
    );
    const mdReport =
      ReportGenerator.generateInfrastructureReport(infraDataList);

    // Write to file
    const filePath = `${configData.generatedDirectoryName}/infrastructure.md`;
    await ReportGenerator.saveReport(mdReport, filePath);
    console.log(`Infrastructure report saved to ${filePath}`);
  } catch (error) {
    console.error(`Error generating infrastructure report: ${error}`);
  }
}
