import { ContributorService } from './github2/contributor-service.js';
import logger from './logger.js';
import type DataConfig from './initialize-with-data.js';
import type { ContributorData } from './github2/models.js';
import GitHubApiClient from './github2/api-client.js';

/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */
// --- Fetch helpers ---
async function fetchContributorsFromGitHub(
  configData: DataConfig
): Promise<ContributorData[]> {
  const apiClient = new GitHubApiClient();
  const contributorCollector = new ContributorService(apiClient);
  if (configData.microsoftContributors.length === 0) {
    logger.warn('No contributors found in configuration.');
    return [];
  }
  logger.info(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  const contributorDataList: ContributorData[] = await Promise.all(
    configData.microsoftContributors.map(async contributor => {
      logger.info(`Processing contributor: ${contributor}`);
      try {
        // Use the GraphQL method for full data
        const contributorData: ContributorData =
          await contributorCollector.getContributorGraphql(contributor, 30);

        return contributorData as unknown as ContributorData;
      } catch (error) {
        logger.error(
          `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
        );
        const emptyContributorData: ContributorData = {
          login: contributor,
          name: '',
          avatarUrl: '',
          company: '',
          blog: '',
          location: '',
          bio: '',
          twitter: '',
          followers: 0,
          following: 0,
          publicRepos: 0,
          publicGists: 0,
          repos: [],
          recentPRs: [],
        };
        return emptyContributorData as unknown as ContributorData;
      }
    })
  );
  // Filter out any nulls (failed fetches)
  return contributorDataList.filter(Boolean) as ContributorData[];
}

// --- Insert helpers ---
// Batch insert contributors
async function insertContributorsIntoDb(
  configData: DataConfig,
  contributorDataList: ContributorData[]
) {
  if (!contributorDataList.length) return;

  await configData.db.databaseServices.contributorService.insertBatch(
    contributorDataList.map(contributorData => ({
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
    }))
  );
}

// --- Main workflow ---
export default async function processContributors(
  configData: DataConfig
): Promise<ContributorData[]> {
  try {
    logger.info(
      `\n\n🔍 ---------------------------------------\nContributor index `
    );
    const contributorDataList: ContributorData[] =
      await fetchContributorsFromGitHub(configData);
    // Deduplicate contributors by login
    const seenLogins = new Set<string>();
    const uniqueContributors = contributorDataList.filter(c => {
      if (!c.login) return false;
      if (seenLogins.has(c.login)) return false;
      seenLogins.add(c.login);
      return true;
    });
    logger.info(
      '[TypeORM] Unique contributors to insert:',
      uniqueContributors.map(c => c.login)
    );
    await insertContributorsIntoDb(configData, uniqueContributors);
    logger.info(
      `\n📊 Contributor data collected for ${contributorDataList.length} contributors and saved ${uniqueContributors.length} to database\n\n`
    );
    return contributorDataList;
  } catch (error) {
    logger.error(
      `Error generating contributor index: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
