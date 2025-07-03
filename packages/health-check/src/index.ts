import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import 'reflect-metadata';
import { createTimestampedDirectory } from './utils/file.js';
import DataConfig from './initialize-with-data.js';
import GitHubApiClient from './github2/api-client.js';
import { ContributorData, OctokitSearchIssue } from './github2/models.js';
import { insertContributorIssuesAndPRs } from './issuesAndPrs.js';
import { getUniqueActiveSimpleRepositories } from './utils/convert.js';
import { processActiveRepos } from './repositories.js';
import GetContributorData from './contributors.js';
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
  const contributorData = await GetContributorData(
    generatedDirectory,
    configData
  );

  if (!contributorData || contributorData.length === 0) {
    console.error('No contributor data found. Exiting...');
    await shutDown(db);
    return;
  } else {
    for await (const contributor of contributorData) {
      await insertContributorIssuesAndPRs(contributor);
    }
    await postProcessing(contributorData);
  }

  await shutDown(db);
  console.log('Generated directory:', generatedDirectory);
  console.log('Health check completed successfully.');
}
async function postProcessing(
  contributorData: ContributorData[]
): Promise<void> {
  if (!contributorData || contributorData.length === 0) {
    console.error('No contributor data found for post-processing.');
    return;
  }

  const totalPrs: OctokitSearchIssue[] = contributorData.flatMap(
    contrib => contrib.recentPRs
  );

  const uniqueActiveRepos = await getUniqueActiveSimpleRepositories(totalPrs);
  if (!uniqueActiveRepos || uniqueActiveRepos.length === 0) {
    console.error('No unique repositories found in recent PRs.');
    return;
  }

  await processActiveRepos(uniqueActiveRepos);

  //const uniqueActiveRepos = await processAndInsertActiveRepos(totalPrs);
  // handle workflows and dependabot alerts for uniqueActiveRepos
}

main().catch((error: unknown) => {
  console.log(error);
  process.exit(1);
});
