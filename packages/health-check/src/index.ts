import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { getConfigData } from './init/initialize-with-data.js';
// import ContributorActivity from './categories/contributor-activity.js';
import ContributorIndex from './categories/contributor-index.js';
// import RepoIndex from './categories/repo-index.js';
//import { printEnv } from './utils/print-env.js';
import Features from './init/features.js';
import { createTimestampedDirectory } from './utils/file.js';
// import {
//   SQL_GET_ALL_REPOSITORY_IDs,
// } from './db/sql-all.js';
//import { repoExtraData } from './categories/repo-index.js';
//import { config } from 'dotenv';
// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//printEnv();

async function init() {
  const token = process.env.GITHUB_TOKEN || process.argv[2];

  if (!token) {
    throw new Error(
      'GitHub token is required. Set GITHUB_TOKEN environment variable or pass token as argument.'
    );
  }

  //const limit = 100;
  const dataDir = process.env.DATA_DIRECTORY || '../../../data';
  const generatedDir = process.env.GENERATED_DIRECTORY || '../generated';
  const generatedDirWithTimestamp = createTimestampedDirectory(generatedDir);

  const dataDirectory = path.join(__dirname, dataDir);
  const generatedDirectory = path.join(__dirname, generatedDirWithTimestamp);

  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  return { token, dataDirectory, generatedDirectory, Features, configData };
}

async function main(): Promise<void> {
  const result = await init();
  if (!result) {
    console.error('Initialization failed. Exiting...');
    process.exit(1);
  }
  const { token, dataDirectory, generatedDirectory, configData } = result;

  console.log('Starting health check ...');
  console.log('Data directory:', dataDirectory);
  console.log('Generated directory:', generatedDirectory);

  // Get data from GraphQL API
  await ContributorIndex(token, generatedDirectory, configData);

  // Get remaining data from REST
  //await GetRemainingRepoData(token, generatedDirectory, configData);

  //const daysOfActivity = 2;

  /*await ContributorActivity(
    token,
    generatedDirectory,
    daysOfActivity,
    configData
  );*/
  //await RepoIndex(token, generatedDirectory, configData);
}

// async function GetRemainingRepoData(
//   token: string,
//   generatedDirectory: string,
//   configData: any
// ): Promise<void> {
//   console.log('Fetching remaining repository data...');
//   try {
//     // get repos from db
//     await repoExtraData(token, generatedDirectory, configData);
//   } catch (error) {
//     console.error(
//       `Error fetching repository data: ${error instanceof Error ? error.message : String(error)}`
//     );
//     throw error;
//   }
// }

main().catch((error: unknown) => {
  console.error('Error running health check:', JSON.stringify(error));
  process.exit(1);
});
