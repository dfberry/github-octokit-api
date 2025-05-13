import GitHubContributor from '../github/github-contributor.js';
import { getConfigData } from '../init/initialize-with-data.js';
import ReportGenerator from '../reports/report-generator.js';
import { ContributorData } from '../models.js';

/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 */
export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );

    // Initialize GitHub API client
    const contributorCollector = new GitHubContributor(token);

    // Get configuration data
    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    // Get contributors from configuration
    if (configData.microsoftContributors.length === 0) {
      console.log('No contributors found in configuration.');
      return;
    }

    console.log(
      `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
    );

    // Collect data for each contributor
    const contributorDataList: ContributorData[] = [];

    for (const contributor of configData.microsoftContributors) {
      console.log(`Processing contributor: ${contributor}`);

      try {
        // Get contributor profile data only
        const contributorData =
          await contributorCollector.getContributorData(contributor);

        // Add to the list with empty repos and PRs arrays
        contributorDataList.push({
          ...contributorData,
          repos: [],
          recentPRs: [],
        });
      } catch (error) {
        console.error(
          `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue with next contributor
      }
    }

    console.log(
      `\n📊 Collected data for ${contributorDataList.length} contributors`
    );

    // Generate a markdown report
    const markdown =
      ReportGenerator.generateContributorIndexReport(contributorDataList);

    // Save report
    const reportFileName =
      configData.generatedDirectoryName + '/contributor-index.md';
    ReportGenerator.saveReport(markdown, reportFileName);

    console.log(`✅ Contributor index report saved to ${reportFileName}`);
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
