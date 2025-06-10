import path from 'path';
import {
  getMostRecentDatabase,
  listDatabases,
  queryDatabase,
  getRepositoryCount,
  getTopRepositories,
  getRepositoriesByTopic,
} from '../utils/query-db.js';
import { getConfigData } from '../init/initialize-with-data.js';

/**
 * CLI utility for querying repository databases
 */

// 1. Get database path and command from CLI args
function getQueryReposDbPathAndCommand(
  args: string[],
  generatedDirectory: string
): { dbPath: string | null; command: string } {
  const command = args[0] || 'help';
  let dbPath: string | null = null;
  if (args.some(arg => arg.startsWith('--db='))) {
    const dbArg = args.find(arg => arg.startsWith('--db='));
    dbPath = dbArg ? dbArg.split('=')[1] : null;
  } else if (command !== 'list-db') {
    dbPath = getMostRecentDatabase(generatedDirectory);
  }
  return { dbPath, command };
}

// 2. Insert into database (not applicable for query-repos, so this is a placeholder for structure)
function insertQueryReposDataIntoDb() {
  // No DB insertions in query-repos CLI utility
}

// 3. Create report/output based on command
async function createQueryReposReport(
  command: string,
  dbPath: string | null,
  args: string[],
  generatedDirectory: string
) {
  switch (command) {
    case 'list-db': {
      const databases = listDatabases(generatedDirectory);
      if (databases.length === 0) {
        console.log('No repository databases found.');
        return;
      }
      console.log('Available repository databases:');
      databases.forEach((db, index) => {
        const relativePath = path.relative(process.cwd(), db);
        const stats = require('fs').statSync(db);
        const createdDate = stats.birthtime.toISOString().split('T')[0];
        const size = Math.round(stats.size / 1024) + ' KB';
        console.log(`${index + 1}. ${relativePath} (${createdDate}, ${size})`);
      });
      return;
    }
    case 'count': {
      if (!dbPath) {
        console.error('No repository database found.');
        return;
      }
      const count = await getRepositoryCount(dbPath);
      console.log(`Total repositories: ${count}`);
      break;
    }
    case 'top': {
      if (!dbPath) {
        console.error('No repository database found.');
        return;
      }
      const limit = parseInt(args[1] || '10', 10);
      const topRepos = await getTopRepositories(dbPath, limit);
      console.log(`Top ${topRepos.length} repositories by stars:`);
      topRepos.forEach((repo, index) => {
        console.log(
          `\n${index + 1}. ${repo.org}/${repo.repo} (⭐ ${repo.stars})`
        );
        console.log(`   Description: ${repo.description || 'No description'}`);
        console.log(`   Topics: ${repo.topics || 'None'}`);
        console.log(`   Forks: ${repo.forks}, Watchers: ${repo.watchers}`);
      });
      break;
    }
    case 'topic': {
      if (!dbPath) {
        console.error('No repository database found.');
        return;
      }
      const topic = args[1];
      if (!topic) {
        console.error('Please specify a topic. Example: topic typescript');
        return;
      }
      const reposByTopic = await getRepositoriesByTopic(dbPath, topic);
      console.log(
        `Found ${reposByTopic.length} repositories with topic '${topic}':`
      );
      reposByTopic.forEach((repo, index) => {
        console.log(
          `\n${index + 1}. ${repo.org}/${repo.repo} (⭐ ${repo.stars})`
        );
        console.log(`   Description: ${repo.description || 'No description'}`);
        console.log(`   Topics: ${repo.topics || 'None'}`);
      });
      break;
    }
    case 'query': {
      if (!dbPath) {
        console.error('No repository database found.');
        return;
      }
      const queryStr = args.slice(1).join(' ');
      if (!queryStr) {
        console.error(
          'Please specify an SQL query. Example: query "SELECT * FROM repositories LIMIT 5"'
        );
        return;
      }
      const results = await queryDatabase(dbPath, queryStr);
      console.log(`Query results (${results.length} rows):`);
      console.table(results);
      break;
    }
    case 'help':
    default:
      console.log('Available commands:');
      console.log('  list-db             List all available database files');
      console.log('  count               Show total number of repositories');
      console.log('  top [limit]         Show top repositories by stars');
      console.log('  topic <topic_name>  Find repositories by topic');
      console.log('  query <sql_query>   Execute a custom SQL query');
      console.log('  help                Show this help message');
      console.log('\nOptions:');
      console.log('  --db=path/to/file.db  Use a specific database file');
      break;
  }
}

export default async function run(
  _token: string,
  dataDirectory: string,
  generatedDirectory: string,
  args: string[]
): Promise<void> {
  console.log(
    `\n\n🔍 ---------------------------------------\nQuery Repository Database`
  );

  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  try {
    // 1. Get DB path and command
    const { dbPath, command } = getQueryReposDbPathAndCommand(
      args,
      generatedDirectory
    );
    // 2. Insert into DB (not used, but for structure)
    insertQueryReposDataIntoDb();
    // 3. Create report/output
    await createQueryReposReport(command, dbPath, args, generatedDirectory);
  } catch (error) {
    console.error(
      `Error querying repository database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
