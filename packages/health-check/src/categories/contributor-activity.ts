//import ReportGenerator from '../reports/report-generator.js';
import GitHubSearcher from '../github/github-search.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { PrSearchItem } from '../models.js';

export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string,
  lastNDays: number
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor activity `
    );

    const collector = new GitHubSearcher(token);
    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    // If no repositories found, exit early
    if (configData.microsoftContributors.length === 0) {
      console.log(
        'No repositories found with contributions in the specified time period.'
      );
      return;
    }

    const date = new Date();
    date.setDate(date.getDate() - lastNDays);
    const dateString = date.toISOString().split('T')[0];
    console.log(`🔍 Analyzing Contributions over the last n days...`);

    const contribRepos: PrSearchItem[] = await collector.findContributedRepos(
      configData.microsoftOrgs,
      configData.microsoftContributors,
      dateString
    );

    console.log(
      `\n📊 Found ${contribRepos.length} repositories with contributions in the last ${lastNDays} days`
    );

    // Generate a report using the enhanced ReportGenerator
    const markdown =
      ReportGenerator.generateContributorActivityReport(contribRepos);

    const reportFileName =
      configData.generatedDirectoryName + '/contributor-activity.md';

    // Save report
    ReportGenerator.saveReport(markdown, reportFileName);

    console.log(`✅ Contributor activity report saved to ${reportFileName}`);
  } catch (error) {
    console.error(
      `Error analyzing Contributor activity: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
