import RepoDataCollector from '../github/github-repo.js';
import ReportGenerator from '../reports/report-generator.js';
import { RepoData } from '../models.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { SimpleRepository, extractOrgAndRepo } from '../utils/regex.js';

import {
  createDatabaseConnection,
  initializeDatabase,
  closeDatabase,
  getDateBasedDbFilename,
  insertRepository,
  insertSecurityData,
} from '../db/index.js';
import {
  SQL_GET_REPOS_WITH_SECURITY_ISSUES,
  SQL_GET_REPOS_WITH_NO_PROTECTIONS,
  SQL_GET_REPOS_WITHOUT_CODE_SCANNING,
  CREATE_SECURITY_TABLE,
} from '../db/sql-all.js';

/**
 * Run health check and generate report
 * @param _token GitHub token (no longer used directly, kept for backwards compatibility)
 * @param dataDirectory Directory containing input data
 * @param generatedDirectory Directory to output data
 */
export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
): Promise<void> {
  let db;
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nHealth check `
    );
    // 1. Get data from GitHub (collect repo data)
    const { configData, repos, repoDataList } =
      await getHealthCheckDataFromGitHub(
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
      const repo = repos[i];
      const repoData = repoDataList[i];
      await insertRepository(db, {
        org: repo.org,
        repo: repo.repo,
        ...repoData,
      });
      const repoId = `${repo.org}/${repo.repo}`;
      await insertSecurityData(db, repoId, {
        securityNotices: repoData.securityNotices,
        hasVulnerabilities: repoData.hasVulnerabilities,
        dependabotAlerts: repoData.dependabotAlerts,
        codeScanning: repoData.codeScanning,
      });
    }

    // 3. Create report
    await createHealthCheckReport(repoDataList, dbFilename, configData);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

async function getHealthCheckDataFromGitHub(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
) {
  const collector = new RepoDataCollector(_token);
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return { configData: null, repos: [], repoDataList: [] };
  }
  const repos: SimpleRepository[] = extractOrgAndRepo(
    configData.microsoftRepos
  );
  console.log(`Extract org and repo data ...`);
  const repoDataList: RepoData[] = [];
  for (const repo of repos) {
    console.log(`Run ${repo.org}/${repo.repo}...`);
    const repoData = await collector.collectRepoData({
      org: repo.org,
      repo: repo.repo,
    });
    repoDataList.push({ ...repoData });
  }
  return { configData, repos, repoDataList };
}

async function createHealthCheckReport(
  repoDataList: RepoData[],
  dbFilename: string,
  configData: any
) {
  const markdown =
    ReportGenerator.generateHealthCheckMarkdownReport(repoDataList);
  const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);
  await ReportGenerator.saveReport(
    reportWithDbInfo,
    configData.generatedDirectoryName + '/health.md'
  );
  if (process.argv.includes('--print') || !process.env.GITHUB_ACTIONS) {
    console.log('\n--- Report Markdown ---\n');
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

All repository and security data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get repositories with security issues
${SQL_GET_REPOS_WITH_SECURITY_ISSUES.trim()}

-- Get repositories with no protections
${SQL_GET_REPOS_WITH_NO_PROTECTIONS.trim()}

-- Get repositories without code scanning enabled
${SQL_GET_REPOS_WITHOUT_CODE_SCANNING.trim()}
\`\`\`

**Schema:**

\`\`\`
${CREATE_SECURITY_TABLE.trim()}
\`\`\`
`;

  // Insert the DB info right before the end of the report or before the Security Status section
  const securityPoint = reportContent.indexOf('## Security Status');
  if (securityPoint === -1) {
    // If no Security Status section, just append it to the end
    return reportContent + dbInfo;
  } else {
    // Insert before the Security Status section
    return (
      reportContent.slice(0, securityPoint) +
      dbInfo +
      reportContent.slice(securityPoint)
    );
  }
}
