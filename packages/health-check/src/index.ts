import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import GetContributorData from './contributors.js';
import { createTimestampedDirectory } from './utils/file.js';
import DataConfig from './initialize-with-data.js';
import 'reflect-metadata';
import GitHubApiClient from './github2/api-client.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get configuration data from the correct directories
 * @param dataDirectory Directory containing input data files
 * @param generatedDirectory Directory to output generated files
 * @returns DataConfig with the correct directory configuration
 */
export function getConfigData(
  dataDirectory: string,
  generatedDirectory: string
): DataConfig | null {
  if (!dataDirectory || !generatedDirectory) {
    console.error('Missing required directory configuration');
    return null;
  }

  return new DataConfig(dataDirectory, generatedDirectory);
}

async function init() {
  const dataDir = process.env.DATA_DIRECTORY || '../../../data';
  const generatedDir = process.env.GENERATED_DIRECTORY || '../generated';
  const generatedDirWithTimestamp = createTimestampedDirectory(generatedDir);

  const dataDirectory = path.join(__dirname, dataDir);
  const generatedDirectory = path.join(__dirname, generatedDirWithTimestamp);

  const configData = new DataConfig(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  const db = null;

  return { dataDirectory, generatedDirectory, configData, db };
}
async function shutDown(db: any): Promise<void> {
  if (db) {
    console.log('Closing database connection...');
    await db.close();
  }
  console.log('Shutdown complete.');
}

async function main(): Promise<void> {
  const result = await init();
  if (!result) {
    console.error('Initialization failed. Exiting...');
    process.exit(1);
  }
  const { dataDirectory, generatedDirectory, configData, db } = result;

  console.log('Starting health check ...');
  console.log('Data directory:', dataDirectory);
  console.log('Generated directory:', generatedDirectory);

  const apiClient = new GitHubApiClient();
  const authenticatedUser = await apiClient.getAndTestGitHubToken();
  console.log('***    Authenticated*** as:', authenticatedUser.login);

  // Get data from GraphQL API
  await GetContributorData(generatedDirectory, configData);

  // Get Repo data from REST API
  //await GetExtraRepoData(token, generatedDirectory, configData, db);

  await shutDown(db);
  console.log('Generated directory:', generatedDirectory);
  console.log('Health check completed successfully.');
}

main().catch((error: unknown) => {
  console.log(error);
  process.exit(1);
});
