import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import 'reflect-metadata';
import { createTimestampedDirectory } from './utils/file.js';
import DataConfig from './config/index.js';
import logger from './utils/logger.js';
import { fetchContributorsFromGitHub } from './contributors.js';
import { fetchPrsFromGitHub } from './issuesAndPrs.js';
import { fetchRepositoriesFromGitHub } from './repositories.js';
import { fetchWorkflowFromGitHub } from './workflows.js';
import { copyAndUpdateGithubDb } from '@dfb/finddb';

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
    logger.error('Missing required directory configuration');
    return null;
  }

  return new DataConfig(dataDirectory, generatedDirectory);
}

async function init(): Promise<DataConfig | undefined> {
  const dataDir = process.env.DATA_DIRECTORY || '../../../data';
  const generatedDir = process.env.GENERATED_DIRECTORY || '../generated';
  const generatedDirWithTimestamp = createTimestampedDirectory(generatedDir);

  const dataDirectory = path.join(__dirname, dataDir);
  const generatedDirectory = path.join(__dirname, generatedDirWithTimestamp);

  const configData = new DataConfig(dataDirectory, generatedDirectory);
  if (!configData) {
    logger.error('No configuration data found. Exiting...');
    return;
  }

  await configData.init();
  if (!configData.db) {
    logger.error('Failed to initialize database connection. Exiting...');
    return;
  }

  return configData;
}
async function main(): Promise<void> {
  const configResult = await init();
  if (!configResult) {
    logger.error('Initialization failed. Exiting...');
    process.exit(1);
  }

  // Get data from GraphQL API, insert into db
  await fetchContributorsFromGitHub(configResult);
  await fetchPrsFromGitHub(configResult);
  await fetchRepositoriesFromGitHub(configResult);
  await fetchWorkflowFromGitHub(configResult);

  await configResult.db.database.destroy();
  logger.info('Generated directory: %s', configResult.generatedDirectory);

  // === Copy generated github.db to ./data/db/github.<timestamp>.db and update github.db.json using @dfb/finddb ===

  await copyAndUpdateGithubDb(configResult.generatedDirectory);

  logger.info('Health check completed successfully.');
}
main().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
