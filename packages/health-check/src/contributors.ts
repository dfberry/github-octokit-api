import { ContributorService } from './github2/contributor-service.js';
import type DataConfig from './initialize-with-data.js';
import type { ContributorData } from './github2/models.js';
import { DbService } from './typeorm/db-service.js';
import { extractOrgAndRepoFromFullName } from './utils/regex.js';
import GitHubApiClient from './github2/api-client.js';
import WorkflowService from './github2/workflow-service.js';
import type { WorkflowWithStatus } from './github2/models.js';
import type { Workflow as DbWorkflow } from './typeorm/Workflow.js';
import {
  mapOctokitWorkflowToEntity,
  mapOctokitDependabotAlertToEntity,
} from './github2/mappers.js';
import DependabotAlertService, {
  DependabotAlertResult,
} from './github2/dependabot-alert-service.js';
import type { DependabotAlert as DbDependabotAlert } from './typeorm/DependabotAlert.js';
import RepositoryService from './github2/repository-service.js';
import { normalizeRepo } from './utils/normalize.js';
// ...existing code...
/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */
// --- Fetch helpers ---
async function fetchContributors(
  configData: DataConfig
): Promise<ContributorData[]> {
  const apiClient = new GitHubApiClient();
  const contributorCollector = new ContributorService(apiClient);
  if (configData.microsoftContributors.length === 0) {
    console.log('No contributors found in configuration.');
    return [];
  }
  console.log(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  const contributorDataList: ContributorData[] = [];
  await Promise.all(
    configData.microsoftContributors.map(async contributor => {
      console.log(`Processing contributor: ${contributor}`);
      try {
        // Use the GraphQL method for full data
        const contributorData =
          await contributorCollector.getContributorGraphql(contributor, 30);
        contributorDataList.push(contributorData as unknown as ContributorData);
      } catch (error) {
        console.log(
          `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );
  return contributorDataList;
}

// --- Insert helpers ---
async function insertContributor(contributorData: ContributorData) {
  await DbService.insertContributor({
    id: contributorData.login,
    avatar_url: contributorData.avatarUrl || '',
    name: contributorData.name,
    company: contributorData.company,
    blog: contributorData.blog,
    location: contributorData.location,
    bio: contributorData.bio,
    twitter: contributorData.twitter,
    followers: contributorData.followers,
    following: contributorData.following,
    public_repos: contributorData.publicRepos,
    public_gists: contributorData.publicGists,
    // add more fields as needed
  });
}

// --- Main workflow ---
export default async function GetContributorData(
  generatedDirectory: string,
  configData: DataConfig
): Promise<ContributorData[]> {
  try {
    console.log(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );
    const contributorDataList = await fetchContributors(configData);
    // Deduplicate contributors by login
    const seenLogins = new Set<string>();
    const uniqueContributors = contributorDataList.filter(c => {
      if (!c.login) return false;
      if (seenLogins.has(c.login)) return false;
      seenLogins.add(c.login);
      return true;
    });
    console.log(
      '[TypeORM] Unique contributors to insert:',
      uniqueContributors.map(c => c.login)
    );
    let savedCount = 0;
    await DbService.init();
    await Promise.all(
      uniqueContributors.map(async contributorData => {
        console.log(
          `\nProcessing contributor: ${contributorData.login} (${contributorData.name})`
        );
        await insertContributor(contributorData);
        savedCount++;
      })
    );

    console.log(
      `\n📊 Contributor data collected for ${contributorDataList.length} contributors and saved ${savedCount} to database\n\n`
    );
    return contributorDataList;
  } catch (error) {
    console.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
