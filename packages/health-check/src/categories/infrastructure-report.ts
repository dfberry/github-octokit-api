import GitHubInfrastructure from '../github/github-infrastructure.js';

import { InfrastructureData } from '../models.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { extractOrgAndRepo } from '../utils/regex.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  closeDatabase,
  getDateBasedDbFilename,
  insertInfrastructureData,
} from '../db/index.js';
import {
  SQL_GET_REPOS_WITH_INFRASTRUCTURE,
  SQL_GET_REPOS_WITH_BICEP_INFRASTRUCTURE,
  SQL_GET_REPOS_WITH_AZURE_YAML,
  CREATE_INFRASTRUCTURE_TABLE,
  CREATE_INFRASTRUCTURE_FOLDERS_TABLE,
} from '../db/sql-infrastructure-report.js';

/**
 * Interface for repository infrastructure data
 */

/**
 * Generate infrastructure report for repositories
 */
export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  let db;
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nInfrastructure report`
    );
    // 1. Get data from GitHub (collect infrastructure data)
    const { configData, repos, infraDataList } =
      await getInfrastructureDataFromGitHub(
        _token,
        dataDirectory,
        generatedDirectory
      );
    if (!configData) return;

    // 2. Insert into database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    console.log(`Creating/connecting to SQLite database: ${dbFilename}`);
    db = await createDatabaseConnection(dbFilename);
    await initializeDatabase(db);
    for (let i = 0; i < repos.length; i++) {
      const infraData = infraDataList[i];
      await insertInfrastructureData(db, infraData);
    }

    // 3. Create report
    await createInfrastructureReport(infraDataList, dbFilename, configData);
  } catch (error) {
    console.error(`Error generating infrastructure report: ${error}`);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

async function getInfrastructureDataFromGitHub(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
) {
  const infraClient = new GitHubInfrastructure(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return { configData: null, repos: [], infraDataList: [] };
  }
  const repos = extractOrgAndRepo(configData.microsoftRepos);
  console.log(
    `Extracted ${repos.length} repositories for infrastructure analysis...`
  );
  const infraDataList: InfrastructureData[] = [];
  for (const repo of repos) {
    console.log(`Analyzing infrastructure for ${repo.org}/${repo.repo}...`);
    const infraData = await infraClient.collectInfrastructureData(
      repo.org,
      repo.repo
    );
    infraDataList.push(infraData);
  }
  return { configData, repos, infraDataList };
}

async function createInfrastructureReport(
  infraDataList: InfrastructureData[],
  dbFilename: string,
  configData: any
) {
  console.log(
    `Generating infrastructure report for ${infraDataList.length} repositories...`
  );
  const mdReport = ReportGenerator.generateInfrastructureReport(infraDataList);
  const reportWithDbInfo = addDbInfoToReport(mdReport, dbFilename);
  const filePath = `${configData.generatedDirectoryName}/infrastructure.md`;
  await ReportGenerator.saveReport(reportWithDbInfo, filePath);
  console.log(`Infrastructure report saved to ${filePath}`);
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

All infrastructure data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get repositories with infrastructure
${SQL_GET_REPOS_WITH_INFRASTRUCTURE.trim()}

-- Get repositories with Bicep infrastructure
${SQL_GET_REPOS_WITH_BICEP_INFRASTRUCTURE.trim()}

-- Get repositories with Azure Developer CLI configuration
${SQL_GET_REPOS_WITH_AZURE_YAML.trim()}
\`\`\`

**Schema:**

\`\`\`
${CREATE_INFRASTRUCTURE_TABLE.trim()}

${CREATE_INFRASTRUCTURE_FOLDERS_TABLE.trim()}
\`\`\`
`;

  // Insert the DB info right before the end of the report or before the Repository Infrastructure Details section
  const detailsPoint = reportContent.indexOf(
    '## Repository Infrastructure Details'
  );
  if (detailsPoint === -1) {
    // If no Details section, just append it to the end
    return reportContent + dbInfo;
  } else {
    // Insert before the Details section
    return (
      reportContent.slice(0, detailsPoint) +
      dbInfo +
      reportContent.slice(detailsPoint)
    );
  }
}
