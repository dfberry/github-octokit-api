import HealthCheck from './categories/health-check.js';
import GenerateReadme from './categories/generate-readme.js';
import SuggestRepos from './categories/suggest-repos.js';
import ContributorActivity from './categories/contributor-activity.js';
import WorkflowReport from './categories/workflow-report.js';
import InfrastructureReport from './categories/infrastructure-report.js';
import RepoIndex from './categories/repo-index.js';
import ContributorIndex from './categories/contributor-index.js';
import { getAuthToken } from './auth/get-auth-token.js';
import { printEnv } from './utils/print-env.js';
import path from 'path';
import Features from './init/features.js';
import Settings from './init/settings.js';
printEnv();

import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIRECTORY || '../../../data';
const generatedDir = process.env.GENERATED_DIRECTORY || '../../../generated';

const dataDirectory = path.join(__dirname, dataDir);
const generatedDirectory = path.join(__dirname, generatedDir);

const limit = 100;

if (!process.env.GITHUB_TOKEN && !process.argv[2]) {
  throw new Error(
    'GitHub token is required. Set GITHUB_TOKEN environment variable or pass token as argument.'
  );
}

const token = getAuthToken(process.argv[2]);

if (!token) {
  console.error(
    'GitHub token not provided. Please set GITHUB_TOKEN environment variable or pass as first argument.'
  );
  process.exit(1);
}

async function main(): Promise<void> {
  Features.healthCheck &&
    (await HealthCheck(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));
  Features.generateReadme &&
    (await GenerateReadme(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));

  Features.suggestRepos &&
    (await SuggestRepos(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory,
      limit
    ));

  Features.contributorActivity &&
    (await ContributorActivity(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory,
      Settings.ContributorActivity.lastNDays
    ));

  Features.workflowReport &&
    (await WorkflowReport(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));

  Features.infrastructureReport &&
    (await InfrastructureReport(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));

  Features.repoIndex &&
    (await RepoIndex(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));

  Features.contributorIndex &&
    (await ContributorIndex(
      process.env.GITHUB_TOKEN || process.argv[2],
      dataDirectory,
      generatedDirectory
    ));
}

main().catch((error: unknown) => {
  console.error('Error running health check:', error);
  process.exit(1);
});
