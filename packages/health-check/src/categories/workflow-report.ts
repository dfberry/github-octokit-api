import GitHubWorkflow from '../github/github-workflow.js';
import ReportGenerator from '../reports/report-generator.js';
import { WorkflowWithStatus } from '../models.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

/**
 * Interface for repository workflow data
 */
interface RepoWorkflowData {
  org: string;
  repo: string;
  full_name: string;
  workflows: WorkflowWithStatus[];
}

/**
 * Run workflow report generation
 * @param token GitHub token
 * @param dataDirectory Directory for input data
 * @param generatedDirectory Directory for output data
 */
export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nWorkflow Report`
    );

    // Initialize GitHub workflow client
    const workflowClient = new GitHubWorkflow(token);

    // Get configuration data
    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    // Extract repositories from config
    const repos: SimpleRepository[] = extractOrgAndRepo(
      configData.microsoftRepos
    );
    console.log(`Extracting org and repo data...`);

    // Collect workflow data for each repository
    const repoWorkflowDataList: RepoWorkflowData[] = [];
    for (const repo of repos) {
      console.log(`Processing workflows for ${repo.org}/${repo.repo}...`);

      // Get workflows with status
      const workflows = await workflowClient.getWorkflowsWithStatus(
        repo.org,
        repo.repo
      );

      // Add to the list
      repoWorkflowDataList.push({
        org: repo.org,
        repo: repo.repo,
        full_name: `${repo.org}/${repo.repo}`,
        workflows: workflows,
      });
    }

    // Generate workflow report
    const markdown =
      ReportGenerator.generateWorkflowsReport(repoWorkflowDataList);

    // Save report
    ReportGenerator.saveReport(
      markdown,
      configData.generatedDirectoryName + '/workflows.md'
    );

    if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
      console.log('\n--- Workflow Report Markdown ---\n');
      console.log(markdown);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
