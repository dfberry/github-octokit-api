import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import 'reflect-metadata';
import { createTimestampedDirectory } from './utils/file.js';
import DataConfig from './config/index.js';
//import { processContributorIssuesAndPRs } from './issuesAndPrs.ts.bak';
//import { processActiveRepos } from './repoAndWorkflow.ts.bak';
import logger from './utils/logger.js';
import { fetchContributorsFromGitHub } from './contributors.js';
//import { getUniqueActiveSimpleRepositories } from './repoAndWorkflow.ts.bak';
import 'dotenv/config';
import { fetchPrsFromGitHub } from './issuesAndPrs.js';
import { fetchRepositoriesFromGitHub } from './repositories.js';
//import { GitHubApiClient } from '@dfb/octokit';
//import { config } from 'dotenv';

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

  // if (!contributorData || contributorData.length === 0) {
  //   logger.error('No contributor data found. Exiting...');
  //   await configResult.db.database.destroy();
  //   return;
  // } else {
  //   await Promise.all(
  //     // process issues and prs for each contributor
  //     contributorData.map(contributor =>
  //       contributor?.found && contributor?.found == true
  //         ? processContributorIssuesAndPRs(configResult, contributor)
  //         : Promise.resolve()
  //     )
  //   );
  //   await postProcessing(configResult, contributorData);
  // }

  await configResult.db.database.destroy();
  logger.info('Generated directory: %s', configResult.generatedDirectory);
  logger.info('Health check completed successfully.');
  // }
  // async function postProcessing(
  //   configData: DataConfig,
  //   contributorData: ContributorData[]
  // ): Promise<void> {
  //   if (!contributorData || contributorData.length === 0) {
  //     logger.error('No contributor data found for post-processing.');
  //     return;
  //   }

  //   const uniqueActiveRepos = await getUniqueActiveSimpleRepositories(configData);
  //   if (!uniqueActiveRepos || uniqueActiveRepos.length === 0) {
  //     logger.error('No unique repositories found in recent PRs.');
  //     return;
  //   }

  //   await processActiveRepos(configData, uniqueActiveRepos);

  //   //const uniqueActiveRepos = await processAndInsertActiveRepos(totalPrs);
  //   // handle workflows and dependabot alerts for uniqueActiveRepos
  // }
}
main().catch((error: unknown) => {
  logger.error(error);
  process.exit(1);
});
