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
    // Parse command line arguments
    const command = args[0] || 'help';
    let dbPath: string | null;

    // Show available databases if specified or use the most recent one
    if (command === 'list-db') {
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

    // Get database path from command line or use the most recent one
    if (args.some(arg => arg.startsWith('--db='))) {
      const dbArg = args.find(arg => arg.startsWith('--db='));
      dbPath = dbArg ? dbArg.split('=')[1] : null;

      if (!dbPath) {
        console.error(
          'Invalid database path format. Use --db=path/to/database.db'
        );
        return;
      }
    } else {
      dbPath = getMostRecentDatabase(generatedDirectory);
      if (!dbPath) {
        console.error(
          'No repository database found. Run suggest-repos first to generate one.'
        );
        return;
      }
    }

    console.log(`Using database: ${path.relative(process.cwd(), dbPath)}`);

    // Execute the appropriate command
    switch (command) {
      case 'count':
        const count = await getRepositoryCount(dbPath);
        console.log(`Total repositories: ${count}`);
        break;

      case 'top':
        const limit = parseInt(args[1] || '10', 10);
        const topRepos = await getTopRepositories(dbPath, limit);
        console.log(`Top ${topRepos.length} repositories by stars:`);

        topRepos.forEach((repo, index) => {
          console.log(
            `\n${index + 1}. ${repo.org}/${repo.repo} (⭐ ${repo.stars})`
          );
          console.log(
            `   Description: ${repo.description || 'No description'}`
          );
          console.log(`   Topics: ${repo.topics || 'None'}`);
          console.log(`   Forks: ${repo.forks}, Watchers: ${repo.watchers}`);
        });
        break;

      case 'topic':
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
          console.log(
            `   Description: ${repo.description || 'No description'}`
          );
          console.log(`   Topics: ${repo.topics || 'None'}`);
        });
        break;

      case 'query':
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
  } catch (error) {
    console.error(
      `Error querying repository database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
