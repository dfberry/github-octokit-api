import GitHubWorkflow from '../github/github-workflow.js';

import ReportGenerator from '../reports/report-generator.js';
import { WorkflowWithStatus } from '../models.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  closeDatabase,
  getDateBasedDbFilename,
  insertWorkflowData,
} from '../db/index.js';
import {
  SQL_GET_ALL_WORKFLOWS_AND_STATUS,
  SQL_GET_REPOS_WITH_ACTIVE_WORKFLOWS,
  SQL_GET_REPOS_WITH_FAILED_WORKFLOW_RUNS,
  CREATE_WORKFLOWS_TABLE,
  CREATE_WORKFLOW_RUNS_TABLE,
} from '../db/sql-workflow-report.js';

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
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  let db;

  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nWorkflow report `
    );

    // 1. Get data from GitHub
    const { repoWorkflowDataList, configData, repos, dbFilename } =
      await getWorkflowReportData(_token, dataDirectory, generatedDirectory);
    if (!configData || !dbFilename) return;

    // 2. Insert into database
    db = await insertWorkflowReportDataIntoDb(
      repoWorkflowDataList,
      repos,
      dbFilename
    );

    // 3. Create report
    await createWorkflowReport(repoWorkflowDataList, dbFilename, configData);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection if it was created
    if (db) {
      await closeDatabase(db);
    }
  }
}

// 1. Get data from GitHub (collect workflow data for each repo)
async function getWorkflowReportData(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
) {
  const workflowClient = new GitHubWorkflow(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return {
      repoWorkflowDataList: [],
      configData: null,
      repos: [],
      dbFilename: null,
    };
  }
  const dbFilename = getDateBasedDbFilename(generatedDirectory);
  const repos: SimpleRepository[] = extractOrgAndRepo(
    configData.microsoftRepos
  );
  console.log(`Extracting org and repo data...`);
  const repoWorkflowDataList: RepoWorkflowData[] = [];
  for (const repo of repos) {
    console.log(`Processing workflows for ${repo.org}/${repo.repo}...`);
    const workflows = await workflowClient.getWorkflowsWithStatus(
      repo.org,
      repo.repo
    );
    repoWorkflowDataList.push({
      org: repo.org,
      repo: repo.repo,
      full_name: `${repo.org}/${repo.repo}`,
      workflows: workflows,
    });
  }
  return { repoWorkflowDataList, configData, repos, dbFilename };
}

// 2. Insert into database
async function insertWorkflowReportDataIntoDb(
  repoWorkflowDataList: RepoWorkflowData[],
  repos: SimpleRepository[],
  dbFilename: string
) {
  const db = await createDatabaseConnection(dbFilename);
  await initializeDatabase(db);
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const repoId = `${repo.org}/${repo.repo}`;
    const workflows = repoWorkflowDataList[i]?.workflows;
    if (workflows && workflows.length > 0) {
      await insertWorkflowData(db, repoId, workflows);
    }
  }
  return db;
}

// 3. Create workflow report
async function createWorkflowReport(
  repoWorkflowDataList: RepoWorkflowData[],
  dbFilename: string,
  configData: any
) {
  const markdown =
    ReportGenerator.generateWorkflowsReport(repoWorkflowDataList);
  const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);
  await ReportGenerator.saveReport(
    reportWithDbInfo,
    configData.generatedDirectoryName + '/workflows.md'
  );
  if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
    console.log('\n--- Workflow Report Markdown ---\n');
    console.log(reportWithDbInfo);
  }
}

/**
 * Add database information to the generated report
 * @param reportContent Original markdown report
 * @param dbPath Path to the database file
 * @returns Updated report with database information
 */
function addDbInfoToReport(reportContent: string, dbPath: string): string {
  const dbInfo = `
## Database Information

All workflow data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get all workflows and their status
${SQL_GET_ALL_WORKFLOWS_AND_STATUS.trim()}

-- Get repositories with active workflows
${SQL_GET_REPOS_WITH_ACTIVE_WORKFLOWS.trim()}

-- Get repositories with failed workflow runs
${SQL_GET_REPOS_WITH_FAILED_WORKFLOW_RUNS.trim()}
\`\`\`

**Schema:**

\`\`\`
${CREATE_WORKFLOWS_TABLE.trim()}

${CREATE_WORKFLOW_RUNS_TABLE.trim()}
\`\`\`
`;

  // Insert the DB info right before the end of the report
  const splitPoint = reportContent.indexOf('## Repository Workflows');
  if (splitPoint === -1) {
    // If no right section found, just append it to the end
    return reportContent + dbInfo;
  } else {
    // Insert before the first repository section
    return (
      reportContent.slice(0, splitPoint) +
      dbInfo +
      reportContent.slice(splitPoint)
    );
  }
}
