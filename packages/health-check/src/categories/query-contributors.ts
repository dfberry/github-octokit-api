import path from 'path';
import sqlite3 from 'sqlite3';
import { getConfigData } from '../init/initialize-with-data.js';
import { createDatabaseConnection, closeDatabase } from '../db/index.js';
import { getMostRecentDatabase, queryDatabase } from '../utils/query-db.js';
import {
  SQL_GET_CONTRIBUTOR_REPOS,
  SQL_GET_TOP_CONTRIBUTORS,
  SQL_GET_COMPANY_CONTRIBUTORS,
  SQL_GET_ACTIVE_CONTRIBUTORS,
} from '../db/sql-query-contributors.js';

/**
 * CLI utility for querying contributor data from the database
 */
export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string,
  args: string[]
): Promise<void> {
  console.log(
    `\n\n🔍 ---------------------------------------\nQuery Contributors Database`
  );
  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }
  try {
    // 1. Get database path
    const dbPath = getQueryContributorsDbPath(args, generatedDirectory);
    if (!dbPath) return;
    console.log(`Using database: ${path.relative(process.cwd(), dbPath)}`);
    // 2. Run the query command
    await runQueryContributorsCommand(dbPath, args);
  } catch (error) {
    console.error(
      `Error querying contributor database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getQueryContributorsDbPath(
  args: string[],
  generatedDirectory: string
): string | null {
  let dbPath: string | null;
  if (args.some(arg => arg.startsWith('--db='))) {
    const dbArg = args.find(arg => arg.startsWith('--db='));
    dbPath = dbArg ? dbArg.split('=')[1] : null;
    if (!dbPath) {
      console.error(
        'Invalid database path format. Use --db=path/to/database.db'
      );
      return null;
    }
  } else {
    dbPath = getMostRecentDatabase(generatedDirectory);
    if (!dbPath) {
      console.error(
        'No database found. Run contributor commands first to generate one.'
      );
      return null;
    }
  }
  return dbPath;
}

async function runQueryContributorsCommand(
  dbPath: string,
  args: string[]
): Promise<void> {
  let db: sqlite3.Database | null = null;
  try {
    db = await createDatabaseConnection(dbPath);
    const command = args[0] || 'help';
    switch (command) {
      case 'count':
        const countResult = await queryDatabase(
          dbPath,
          'SELECT COUNT(*) as count FROM contributors'
        );
        console.log(`Total contributors: ${countResult[0]?.count || 0}`);
        break;
      case 'top':
        const limit = parseInt(args[1] || '10', 10);
        const topContributors = await queryDatabase(
          dbPath,
          SQL_GET_TOP_CONTRIBUTORS,
          [limit]
        );
        console.log(`Top ${topContributors.length} contributors by followers:`);
        console.table(topContributors);
        break;
      case 'company':
        const companyName = args[1] || '';
        if (!companyName) {
          console.error(
            'Please specify a company name. Example: company Microsoft'
          );
          return;
        }
        const companyContributors = await queryDatabase(
          dbPath,
          SQL_GET_COMPANY_CONTRIBUTORS,
          [`%${companyName}%`]
        );
        console.log(
          `Found ${companyContributors.length} contributors from company '${companyName}':`
        );
        console.table(companyContributors);
        break;
      case 'active':
        const activeContributors = await queryDatabase(
          dbPath,
          SQL_GET_ACTIVE_CONTRIBUTORS
        );
        console.log('Most recently active contributors:');
        console.table(activeContributors);
        break;
      case 'repos':
        const contributorLogin = args[1];
        if (!contributorLogin) {
          console.error(
            'Please specify a contributor login. Example: repos octocat'
          );
          return;
        }
        const contributorRepos = await queryDatabase(
          dbPath,
          SQL_GET_CONTRIBUTOR_REPOS,
          [contributorLogin]
        );
        if (contributorRepos.length === 0) {
          console.log(
            `No repositories found for contributor '${contributorLogin}'`
          );
        } else {
          console.log(`Repositories contributed to by '${contributorLogin}':`);
          console.table(contributorRepos);
        }
        break;
      case 'query':
        const queryStr = args.slice(1).join(' ');
        if (!queryStr) {
          console.error(
            'Please specify an SQL query. Example: query "SELECT login, name FROM contributors LIMIT 5"'
          );
          return;
        }
        const results = await queryDatabase(dbPath, queryStr);
        console.log(`Query results (${results.length} rows):`);
        console.table(results);
        break;
      case 'help':
      default:
        console.log('Available commands:');
        console.log('  count               Show total number of contributors');
        console.log('  top [limit]         Show top contributors by followers');
        console.log('  company <name>      Find contributors by company name');
        console.log(
          '  active              Show most recently active contributors'
        );
        console.log(
          '  repos <login>       List repositories for a specific contributor'
        );
        console.log('  query <sql_query>   Execute a custom SQL query');
        console.log('  help                Show this help message');
        console.log('\nOptions:');
        console.log('  --db=path/to/file.db  Use a specific database file');
        break;
    }
  } finally {
    if (db) {
      await closeDatabase(db);
    }
  }
}
