import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { getConfigData } from './init/initialize-with-data.js';
//import { checkTokenScope } from './github/github-token-scope.js';
import ContributorActivity from './categories/contributor-activity.js';
import ContributorIndex from './categories/contributor-index.js';
// import WorkflowReport from './categories/workflow-report.js';
// import InfrastructureReport from './categories/infrastructure-report.js';
//import RepoIndex from './categories/repo-index.js';
// import HealthCheck from './categories/health-check.js';
// import GraphQLHealthCheck from './categories/graphql-health-check.js';
// import GenerateReadme from './categories/generate-readme.js';
// import SuggestRepos from './categories/suggest-repos.js';
// import QueryRepos from './categories/query-repos.js';
// import QueryContributors from './categories/query-contributors.js';
//import ContributorRepos from './categories/contributor-repos.js';
import { printEnv } from './utils/print-env.js';
import Features, { Features as FeaturesType } from './init/features.js';
//import Settings from './init/settings.js';
//import fs from 'fs';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

printEnv();

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

  // Define the mapping between command-line switches and feature keys
  const commandSwitchMap: Record<string, keyof FeaturesType> = {
    '--health-check': 'healthCheck',
    '--generate-readme': 'generateReadme',
    '--suggest-repos': 'suggestRepos',
    '--contributor-activity': 'contributorActivity',
    '--workflow-report': 'workflowReport',
    '--infrastructure-report': 'infrastructureReport',
    '--repo-index': 'repoIndex',
    '--contributor-index': 'contributorIndex',
    '--query-repos': 'queryRepos',
    '--query-contributors': 'queryContributors',
    '--discover-repos': 'discoverRepos',
  };

  // Check for command-line arguments that should take precedence over environment settings
  const requestedSwitches = Object.keys(commandSwitchMap).filter(flag =>
    process.argv.includes(flag)
  );

  if (requestedSwitches.length > 0) {
    // If any switch is present, disable all features first
    (Object.keys(Features) as Array<keyof FeaturesType>).forEach(key => {
      Features[key] = false;
    });

    // Then enable only the requested features
    requestedSwitches.forEach(flag => {
      const featureKey = commandSwitchMap[flag];
      Features[featureKey] = true;
      console.log(
        `✅ Command line flag ${flag} detected, enabling ${featureKey}`
      );
    });
  }

  const configData = getConfigData(dataDirectory, generatedDirectory);
  if (!configData) {
    console.error('No configuration data found. Exiting...');
    return;
  }

  // Test GitHub authentication once at startup
  // if (!(await checkTokenScope(token))) {
  //   process.exit(1);
  // }
  return { token, dataDirectory, generatedDirectory, Features, configData };
}

async function main(): Promise<void> {
  const result = await init();
  if (!result) {
    console.error('Initialization failed. Exiting...');
    process.exit(1);
  }
  const { token, dataDirectory, generatedDirectory, Features, configData } =
    result;

  console.log('Starting health check ...');
  console.log('Data directory:', dataDirectory);
  console.log('Generated directory:', generatedDirectory);

  // if (Features.healthCheck) {
  //   // Use GraphQL version by default (more efficient), fall back to REST if --use-rest flag is provided
  //   if (process.argv.includes('--use-rest')) {
  //     console.log(
  //       'Using REST API for health check (less efficient but more compatible)'
  //     );
  //     await HealthCheck(token, dataDirectory, generatedDirectory);
  //   } else {
  //     console.log('Using GraphQL API for health check (more efficient)');
  //     await GraphQLHealthCheck(token, dataDirectory, generatedDirectory);
  //   }
  // }

  // Features.generateReadme &&
  //   (await GenerateReadme(token, dataDirectory, generatedDirectory));

  // Features.suggestRepos &&
  //   (await SuggestRepos(token, dataDirectory, generatedDirectory, limit));

  // Features.contributorActivity &&
  //   (await ContributorActivity(
  //     token,
  //     dataDirectory,
  //     generatedDirectory,
  //     Settings.ContributorActivity.lastNDays
  //   ));

  // Features.workflowReport &&
  //   (await WorkflowReport(token, dataDirectory, generatedDirectory));

  // Features.infrastructureReport &&
  //   (await InfrastructureReport(token, dataDirectory, generatedDirectory));

  // Features.repoIndex &&
  //   (await RepoIndex(token, dataDirectory, generatedDirectory));

  Features.contributorIndex &&
    (await ContributorIndex(token, generatedDirectory, configData));

  const daysOfActivity = 2;

  await ContributorActivity(token, generatedDirectory, daysOfActivity);

  // // Check for query-repos command and extract additional arguments
  // if (Features.queryRepos) {
  //   // Find the index of the --query-repos flag
  //   const queryFlagIndex = process.argv.findIndex(
  //     arg => arg === '--query-repos'
  //   );

  //   // Extract all arguments after the flag
  //   const queryArgs =
  //     queryFlagIndex >= 0
  //       ? process.argv
  //           .slice(queryFlagIndex + 1)
  //           .filter(arg => !arg.startsWith('--'))
  //       : [];

  //   await QueryRepos(token, dataDirectory, generatedDirectory, queryArgs);
  // }

  // Check for query-contributors command and extract additional arguments
  // if (Features.queryContributors) {
  //   // Find the index of the --query-contributors flag
  //   const queryFlagIndex = process.argv.findIndex(
  //     arg => arg === '--query-contributors'
  //   );

  //   // Extract all arguments after the flag
  //   const queryArgs =
  //     queryFlagIndex >= 0
  //       ? process.argv
  //           .slice(queryFlagIndex + 1)
  //           .filter(arg => !arg.startsWith('--'))
  //       : [];

  //   await QueryContributors(
  //     token,
  //     dataDirectory,
  //     generatedDirectory,
  //     queryArgs
  //   );
  // }
}

/**
 * Create a new directory based on the current date and time (YYYYMMDD_HHmmss)
 * @param baseDir The base directory where the new directory will be created
 * @returns The path to the newly created directory
 */
export function createTimestampedDirectory(baseDir: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dirName = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  console.log(`Creating timestamped directory: ${dirName}`);
  const fullPath = path.join(baseDir, dirName);
  console.log(`Full path for timestamped directory: ${fullPath}`);
  // // Try to create the directory, handle EACCES error gracefully
  // try {
  //   if (!fs.existsSync(fullPath)) {
  //     fs.mkdirSync(fullPath, { recursive: true });
  //   }
  // } catch (err: any) {
  //   if (err.code === 'EACCES') {
  //     console.error(`Permission denied when creating directory: ${fullPath}`);
  //     throw new Error(
  //       `EACCES: permission denied, cannot create directory at ${fullPath}`
  //     );
  //   } else {
  //     throw err;
  //   }
  // }
  return fullPath;
}

main().catch((error: unknown) => {
  console.error('Error running health check:', JSON.stringify(error));
  process.exit(1);
});
