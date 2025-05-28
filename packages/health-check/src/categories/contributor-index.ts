import GitHubContributor from '../github/github-contributor.js';
import { getConfigData } from '../init/initialize-with-data.js';
import ReportGenerator from '../reports/report-generator.js';
import { ContributorData } from '../models.js';
import {
  createDatabaseConnection,
  initializeDatabase,
  insertContributor,
  closeDatabase,
  getDateBasedDbFilename,
} from '../utils/db.js';

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

    // Initialize the database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    console.log(`Creating/connecting to SQLite database: ${dbFilename}`);

    let db;
    try {
      // Create database connection and initialize schema
      db = await createDatabaseConnection(dbFilename);
      await initializeDatabase(db);

      // Collect data for each contributor
      const contributorDataList: ContributorData[] = [];
      let savedCount = 0;

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

          // Save contributor data to database
          await insertContributor(db, contributorData);
          savedCount++;
        } catch (error) {
          console.error(
            `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
          );
          // Continue with next contributor
        }
      }

      console.log(
        `\n📊 Collected data for ${contributorDataList.length} contributors and saved ${savedCount} to database`
      );

      // Generate a markdown report
      const markdown =
        ReportGenerator.generateContributorIndexReport(contributorDataList);

      // Add database information to the report
      const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);

      // Save report
      const reportFileName =
        configData.generatedDirectoryName + '/contributor-index.md';
      ReportGenerator.saveReport(reportWithDbInfo, reportFileName);

      console.log(`✅ Contributor index report saved to ${reportFileName}`);
    } finally {
      // Close database connection if it was created
      if (db) {
        await closeDatabase(db);
      }
    }
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
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

All contributor data is stored in a SQLite database. You can query it using standard SQL commands.

**Database path:** \`${dbPath}\`

**Example queries:**

\`\`\`sql
-- Get all contributors
SELECT login, name, company, followers, following FROM contributors;

-- Get top contributors by number of followers
SELECT login, name, followers FROM contributors ORDER BY followers DESC LIMIT 10;

-- Search for contributors by name or company
SELECT * FROM contributors WHERE name LIKE '%Microsoft%' OR company LIKE '%Microsoft%';
\`\`\`

**Schema:**

\`\`\`
CREATE TABLE contributors (
  login TEXT PRIMARY KEY,
  name TEXT,
  company TEXT,
  blog TEXT,
  location TEXT,
  email TEXT,
  bio TEXT,
  twitter TEXT,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  public_repos INTEGER DEFAULT 0,
  public_gists INTEGER DEFAULT 0,
  avatar_url TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
)
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
