import GraphQLRepoDataCollector from '../github/github-repo-graphql.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { extractOrgAndRepo } from '../utils/regex.js';
import path from 'path';

import {
  createDatabaseConnection,
  initializeDatabase,
  closeDatabase,
  getDateBasedDbFilename,
  insertRepository,
  insertSecurityData,
} from '../db/index.js';
import {
  SQL_GET_REPOS_WITH_VULNERABILITIES,
  SQL_GET_REPOS_WITHOUT_DEPENDABOT,
} from '../db/sql-all.js';

/**
 * Run health check using GraphQL and generate report
 * This version reduces API requests by using GraphQL and batching
 *
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
      `\n\n🔍 ---------------------------------------\nGraphQL-optimized Health check `
    );
    // 1. Get data from GitHub (batch collect repo data)
    const { configData, repoDataList, repos } =
      await getGraphQLHealthCheckDataFromGitHub(
        _token,
        dataDirectory,
        generatedDirectory
      );
    if (!configData) return;

    // 2. Insert into database
    const generatedOssDir = path.join(generatedDirectory, 'oss');
    const dbFilename = getDateBasedDbFilename(generatedOssDir);
    db = await createDatabaseConnection(dbFilename);
    await initializeDatabase(db);
    for (const repoData of repoDataList) {
      await insertRepository(db, repoData);
      const repoId = `${repoData.org}/${repoData.repo}`;
      await insertSecurityData(db, repoId, {
        securityNotices: repoData.securityNotices,
        hasVulnerabilities: repoData.hasVulnerabilities,
        dependabotAlerts: repoData.dependabotAlerts,
        codeScanning: repoData.codeScanning,
      });
    }

    // 3. Create report
    await createGraphQLHealthCheckReport(
      repoDataList,
      dbFilename,
      configData,
      repos
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}

async function getGraphQLHealthCheckDataFromGitHub(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string
) {
  const collector = new GraphQLRepoDataCollector(_token, {
    cacheEnabled: true,
    cachePath: `${dataDirectory}/.cache`,
    cacheValidTimeMs: 1000 * 60 * 60 * 6, // 6 hours cache validity
  });
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return { configData: null, repoDataList: [], repos: [] };
  }
  const repoUrls = configData.activeRepos.map(
    repo => `${repo.org}/${repo.repo}`
  );
  const repos = extractOrgAndRepo(repoUrls);
  console.log(`\nChecking ${repoUrls.length} repositories...`);
  console.log('Using batch collection to reduce API requests');
  const repoDataList = await collector.batchCollectReposData(repos);
  return { configData, repoDataList, repos };
}

async function createGraphQLHealthCheckReport(
  repoDataList: any[],
  dbFilename: string,
  configData: any,
  repos: any[]
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
  // Log stats on API usage savings
  const totalRepos = repos.length;
  const estimatedRestCalls = totalRepos * 5; // Approx 5 REST calls per repo
  const estimatedGraphQLCalls = Math.ceil(totalRepos / 10) + (totalRepos % 10); // Batch size of 10 + remainder
  console.log('\n📊 API Usage Statistics:');
  console.log(`Repositories processed: ${totalRepos}`);
  console.log(`Estimated REST API calls (old method): ${estimatedRestCalls}`);
  console.log(
    `Estimated GraphQL API calls (new method): ${estimatedGraphQLCalls}`
  );
  console.log(
    `Estimated API call reduction: ${Math.round((1 - estimatedGraphQLCalls / estimatedRestCalls) * 100)}%`
  );
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

### Example Queries

**Get all repositories with vulnerabilities:**

\`\`\`sql
${SQL_GET_REPOS_WITH_VULNERABILITIES.trim()}
\`\`\`

**Get repositories without Dependabot enabled:**

\`\`\`sql
${SQL_GET_REPOS_WITHOUT_DEPENDABOT.trim()}
\`\`\`

## Cache Information

This report used GraphQL-optimized data collection with caching to reduce API requests.
`;
  return reportContent + dbInfo;
}
