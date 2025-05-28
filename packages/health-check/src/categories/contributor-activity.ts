import GitHubSearcher from '../github/github-search.js';
import GitHubContributor from '../github/github-contributor.js';
import ReportGenerator from '../reports/report-generator.js';
import { getConfigData } from '../init/initialize-with-data.js';
import { PrSearchItem } from '../models.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  insertContributor,
  linkContributorToRepo,
  closeDatabase,
  getDateBasedDbFilename,
} from '../utils/db.js';

export default async function run(
  token: string,
  dataDirectory: string,
  generatedDirectory: string,
  lastNDays: number
): Promise<void> {
  let db;

  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor activity `
    );

    const collector = new GitHubSearcher(token);
    const contributorCollector = new GitHubContributor(token);
    const configData = getConfigData(dataDirectory, generatedDirectory);
    if (!configData) {
      console.error('No configuration data found. Exiting...');
      return;
    }

    // If no contributors found, exit early
    if (configData.microsoftContributors.length === 0) {
      console.log('No contributors found in the configuration.');
      return;
    }

    const date = new Date();
    date.setDate(date.getDate() - lastNDays);
    const dateString = date.toISOString().split('T')[0];
    console.log(
      `🔍 Analyzing Contributions over the last ${lastNDays} days...`
    );

    // Initialize the database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    console.log(`Creating/connecting to SQLite database: ${dbFilename}`);

    // Create database connection and initialize schema
    db = await createDatabaseConnection(dbFilename);
    await initializeDatabase(db);

    const contribRepos: PrSearchItem[] = await collector.findContributedRepos(
      configData.microsoftOrgs,
      configData.microsoftContributors,
      dateString
    );

    console.log(
      `\n📊 Found ${contribRepos.length} pull requests with contributions in the last ${lastNDays} days`
    );

    // Track contributors and their repositories
    console.log(
      'Starting to link contributors to repositories in the database...'
    );

    // Create a map to track unique contributor-repo combinations
    // This helps prevent duplicate database entries
    const contributorRepoMap = new Map<string, Set<string>>();

    // Collect contribution data and link contributors to repositories
    let linkCount = 0;

    for (const pr of contribRepos) {
      if (!pr.user || !pr.user.login) continue;

      const login = pr.user.login;
      // Extract repo info from repository_url (format: https://api.github.com/repos/org/repo)
      const repoUrlParts = pr.repository_url.split('/');
      if (repoUrlParts.length < 5) continue;

      const org = repoUrlParts[repoUrlParts.length - 2];
      const repo = repoUrlParts[repoUrlParts.length - 1];
      const repoId = `${org}/${repo}`;

      // Track unique contributor-repo combinations
      if (!contributorRepoMap.has(login)) {
        contributorRepoMap.set(login, new Set<string>());
      }
      contributorRepoMap.get(login)!.add(repoId);

      // Get more detailed contributor data for new contributors
      try {
        // Insert contributor if it doesn't exist in the map
        if (contributorRepoMap.get(login)!.size === 1) {
          console.log(`Getting detailed data for contributor: ${login}`);
          const contributorData =
            await contributorCollector.getContributorData(login);
          await insertContributor(db, contributorData);
        }

        // Link contributor to repository with contribution data
        await linkContributorToRepo(
          db,
          repoId,
          login,
          1, // Start with 1 contribution (we can update this with actual counts later)
          false, // Assume not a maintainer by default
          pr.created_at // Use PR creation date as last contributed date
        );

        linkCount++;
      } catch (error) {
        console.error(
          `Error processing contributor ${login} for repo ${repoId}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue with next PR
      }
    }

    console.log(
      `Successfully linked ${linkCount} contributor-repository relationships in the database`
    );

    // Generate a report using the enhanced ReportGenerator
    const markdown =
      ReportGenerator.generateContributorActivityReport(contribRepos);

    // Add database information to the report
    const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);

    const reportFileName =
      configData.generatedDirectoryName + '/contributor-activity.md';

    // Save report
    ReportGenerator.saveReport(reportWithDbInfo, reportFileName);

    console.log(`✅ Contributor activity report saved to ${reportFileName}`);
  } catch (error) {
    console.error(
      `Error analyzing Contributor activity: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  } finally {
    // Close database connection if it was created
    if (db) {
      await closeDatabase(db);
    }
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

All contributor and repository relationship data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get contributors with their repository counts
SELECT c.login, c.name, COUNT(rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.login = rc.contributor_login
GROUP BY c.login
ORDER BY repo_count DESC;

-- Get repositories for a specific contributor
SELECT r.full_name, r.description, rc.contribution_count, rc.last_contributed_at
FROM repositories r
JOIN repo_contributors rc ON r.id = rc.repo_id
WHERE rc.contributor_login = 'username'
ORDER BY rc.last_contributed_at DESC;

-- Find contributors who work on multiple repositories
SELECT c.login, c.name, COUNT(DISTINCT rc.repo_id) as repo_count
FROM contributors c
JOIN repo_contributors rc ON c.login = rc.contributor_login
GROUP BY c.login
HAVING repo_count > 1
ORDER BY repo_count DESC;
\`\`\`

**Schema:**

\`\`\`
CREATE TABLE repo_contributors (
  repo_id TEXT,
  contributor_login TEXT,
  contribution_count INTEGER DEFAULT 0,
  is_maintainer INTEGER DEFAULT 0,
  last_contributed_at TEXT,
  PRIMARY KEY (repo_id, contributor_login)
)
\`\`\`
`;

  // Insert the DB info right before the end of the report or the Summary section
  const summaryPoint = reportContent.lastIndexOf('## Summary');
  if (summaryPoint === -1) {
    // If no Summary section, just append it to the end
    return reportContent + dbInfo;
  } else {
    // Insert before the Summary section
    return (
      reportContent.slice(0, summaryPoint) +
      dbInfo +
      reportContent.slice(summaryPoint)
    );
  }
}
