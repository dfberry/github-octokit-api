import GitHubContributor from '../github/github-contributor.js';
import type { DataConfig } from '../init/initialize-with-data.js';
import ReportGenerator from '../reports/report-generator.js';
import { ContributorData } from '../models.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  insertContributor,
  closeDatabase,
  getDateBasedDbFilename,
  insertContributorIssuesAndPRs,
  insertUniqueContributedRepos,
  //insertOrUpdateUserRepositoryRelationship,
} from '../db/index.js';
import {
  CREATE_CONTRIBUTORS_TABLE,
  SQL_GET_ALL_CONTRIBUTORS,
  SQL_GET_TOP_CONTRIBUTORS,
  SQL_SEARCH_CONTRIBUTORS,
} from '../db/sql-all.js';

/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */
export default async function run(
  _token: string,
  generatedDirectory: string,
  configData: DataConfig
): Promise<void> {
  let db;

  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );

    // 1. Get data from GitHub
    const contributorDataList = await getContributorDataFromGitHub(
      _token,
      configData
    );

    // 2. Insert into database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    console.log(`Creating/connecting to SQLite database: ${dbFilename}`);
    let savedCount = 0;
    try {
      db = await createDatabaseConnection(dbFilename);
      await initializeDatabase(db);
      for (const contributorData of contributorDataList) {
        await insertContributor(db, contributorData);
        // Insert issues and PRs for this contributor
        await insertContributorIssuesAndPRs(
          db,
          contributorData.login,
          (contributorData as any).issuesList || [],
          (contributorData as any).pullRequestsList || []
        );
        // Insert unique contributed repos for this contributor
        await insertUniqueContributedRepos(
          db,
          ((contributorData as any).contributedReposList || []).concat(
            (contributorData as any).repositoriesList || []
          )
        );

        // Insert user-repository relationships for contributed, owned, starred, issues, and PRs
        //await createAndInsertUserRepositoryRelationships(contributorData, db);
        savedCount++;
      }
    } finally {
      if (db) {
        await closeDatabase(db);
      }
    }
    console.log(
      `\n📊 Collected data for ${contributorDataList.length} contributors and saved ${savedCount} to database`
    );

    // 3. Create report
    await createContributorIndexReport(
      contributorDataList,
      dbFilename,
      configData
    );
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function getContributorDataFromGitHub(
  _token: string,
  configData: DataConfig
): Promise<ContributorData[]> {
  const contributorCollector = new GitHubContributor(_token);
  if (configData.microsoftContributors.length === 0) {
    console.log('No contributors found in configuration.');
    return [];
  }
  console.log(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  const contributorDataList: ContributorData[] = [];
  for (const contributor of configData.microsoftContributors) {
    console.log(`Processing contributor: ${contributor}`);
    try {
      const contributorData =
        await contributorCollector.getContributorData(contributor);

      const repoList = [
        ...((contributorData as any).contributedReposList || []),
        ...((contributorData as any).repositoriesList || []),
      ];

      contributorDataList.push({
        ...contributorData,
        repos: repoList || [],
        recentPRs: contributorData.pullRequestsList || [],
      });
    } catch (error) {
      console.log(
        `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue with next contributor
    }
  }
  return contributorDataList;
}

async function createContributorIndexReport(
  contributorDataList: ContributorData[],
  dbFilename: string,
  configData: DataConfig
) {
  const markdown =
    ReportGenerator.generateContributorIndexReport(contributorDataList);
  const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);
  const reportFileName =
    configData.generatedDirectoryName + '/contributor-index.md';
  ReportGenerator.saveReport(reportWithDbInfo, reportFileName);
  console.log(`✅ Contributor index report saved to ${reportFileName}`);
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

All contributor data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get all contributors
${SQL_GET_ALL_CONTRIBUTORS.trim()}

-- Get top contributors by number of followers
${SQL_GET_TOP_CONTRIBUTORS.trim()}

-- Search for contributors by name or company
${SQL_SEARCH_CONTRIBUTORS.trim()}
\`\`\`

**Schema:**

\`\`\`
${CREATE_CONTRIBUTORS_TABLE.trim()}
\`\`\`
`;

  // Insert the DB info right before the end of the report
  const splitPoint = reportContent.lastIndexOf('## Summary');
  if (splitPoint === -1) {
    // If no Summary section, just append it to the end
    return reportContent + dbInfo;
  } else {
    // Insert before the Summary section
    return (
      reportContent.slice(0, splitPoint) +
      dbInfo +
      reportContent.slice(splitPoint)
    );
  }
}

// async function createAndInsertUserRepositoryRelationships(
//   contributorData: any,
//   db: any
// ) {
//   const now = new Date().toISOString();
//   const userLogin = contributorData.login;
//   const contributedRepos = (contributorData as any).contributedReposList || [];
//   const ownedRepos = (contributorData as any).repositoriesList || [];
//   const starredRepos = (contributorData as any).starredRepositoriesList || [];
//   const issues = (contributorData as any).issuesList || [];
//   const prs = (contributorData as any).pullRequestsList || [];

//   const getRepoId = (repo: any) =>
//     repo.id || repo.nameWithOwner || repo.full_name || repo.name;

//   const repoMap = new Map<string, any>();
//   for (const repo of contributedRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     repoMap.set(id, { contributed_to: true });
//   }
//   for (const repo of ownedRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).owned = true;
//   }
//   for (const repo of starredRepos) {
//     const id = getRepoId(repo);
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).starred = true;
//   }
//   for (const issue of issues) {
//     const id = getRepoId(issue.repository || {});
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).has_issues = true;
//   }
//   for (const pr of prs) {
//     const id = getRepoId(pr.repository || {});
//     if (!id) continue;
//     if (!repoMap.has(id)) repoMap.set(id, {});
//     repoMap.get(id).has_prs = true;
//   }

//   for (const [repo_id, flags] of repoMap.entries()) {
//     const doc = {
//       user_login: userLogin,
//       repo_id,
//       contributed_to: !!flags.contributed_to,
//       owned: !!flags.owned,
//       starred: !!flags.starred,
//       has_issues: !!flags.has_issues,
//       has_prs: !!flags.has_prs,
//       data_inserted_at: now,
//     };

//     await insertOrUpdateUserRepositoryRelationship(db, doc);
//   }
// }
