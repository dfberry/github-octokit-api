import ReportGenerator from '../reports/report-generator.js';
import {
  createDatabaseConnection,
  closeDatabase,
  getDateBasedDbFilename,
} from '../db/index.js';
import type { DataConfig } from '../init/initialize-with-data.js';
import { SQL_GET_CONTRIBUTOR_ACTIVITY } from '../db/sql-all.js';

export default async function run(
  _token: string,
  generatedDirectory: string,
  _lastNDays: number,
  configData: DataConfig
): Promise<void> {
  let db: import('sqlite3').Database | undefined;

  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor activity (from database)`
    );

    // 1. Read from database
    const dbFilename = getDateBasedDbFilename(generatedDirectory);
    db = await createDatabaseConnection(dbFilename);
    const dbConn = db!; // Type assertion: db is defined
    // Query all contributor activity
    const activityRows: any[] = await new Promise((resolve, reject) => {
      dbConn.all(
        SQL_GET_CONTRIBUTOR_ACTIVITY,
        [],
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    await closeDatabase(dbConn);

    // 2. Create report

    console.log(`Found ${activityRows.length} contributors with activity.`);

    await createContributorActivityReport(activityRows, dbFilename, configData);
  } catch (error) {
    console.error(
      `Error generating Contributor activity report: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function createContributorActivityReport(
  activityRows: any[],
  dbFilename: string,
  configData: DataConfig
) {
  // You may want to transform activityRows to the format expected by your report generator
  const markdown =
    ReportGenerator.generateContributorActivityReport(activityRows);
  const reportWithDbInfo = addDbInfoToReport(markdown, dbFilename);
  // Save in the same directory as contributor-index.md, as contributor-activity.md

  const reportFileName =
    configData.generatedDirectoryName + '/contributor-activity.md';

  ReportGenerator.saveReport(reportWithDbInfo, reportFileName);
  console.log(`✅ Contributor activity report saved to ${reportFileName}`);
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
${SQL_GET_CONTRIBUTOR_ACTIVITY.trim()}

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
