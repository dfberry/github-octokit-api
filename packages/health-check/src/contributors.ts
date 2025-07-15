import logger from './utils/logger.js';
import DataConfig from './config/index.js';
import { ContributorService, OctokitUser } from '@dfb/octokit';
import { GitHubContributorEntity } from '@dfb/db';

/**
 * Generate a contributor index report
 * @param token GitHub API token
 * @param dataDirectory Directory containing configuration data
 * @param generatedDirectory Directory to save generated reports
 * @param configData Configuration data for contributors
 */

export async function fetchContributorsFromGitHub(
  configData: DataConfig
): Promise<void> {
  if (!configData || !configData.githubClient) {
    logger.error(
      'GitHub API client is not initialized. Please check your configuration and ensure a valid GitHub token is provided.'
    );
    return;
  }

  const contributorCollector = new ContributorService(configData.githubClient);
  if (configData.microsoftContributors.length === 0) {
    logger.warn('No contributors found in configuration.');
    return;
  }
  logger.info(
    `🔍 Collecting data for ${configData.microsoftContributors.length} contributors...`
  );
  await Promise.all(
    configData.microsoftContributors.map(async contributor => {
      logger.info(`Processing contributor: ${contributor}`);
      try {
        // Use the GraphQL method for full data
        const contributorData: OctokitUser | null =
          await contributorCollector.getContributor(contributor);

        if (!contributorData) {
          logger.warn(`No data found for contributor: ${contributor}`);
          return null;
        }
        const dbUser = octokitUserToGitHubContributorEntity(contributorData);
        configData?.contributors?.add(dbUser);

        const dbInsertResult =
          await configData.db.databaseServices.contributorService.insertOne(
            dbUser
          );
        if (dbInsertResult) {
          logger.info(
            `Inserted/Updated contributor ${contributor} in database.`
          );
        } else {
          logger.warn(
            `Failed to insert/update contributor ${contributor} in database.`
          );
        }
        logger.info(
          `Total contributors so far: ${configData?.contributors?.size}`
        );
      } catch (error) {
        logger.error(
          `Error processing contributor ${contributor}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );
}

export function octokitUserToGitHubContributorEntity(
  user: OctokitUser
): GitHubContributorEntity {
  return {
    id: user.login,
    name: user.name ?? undefined,
    company: user.company ?? undefined,
    blog: user.blog ?? undefined,
    location: user.location ?? undefined,
    email: user.email ?? undefined,
    bio: user.bio ?? undefined,
    twitter: user.twitter_username ?? undefined,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    public_repos: user.public_repos ?? 0,
    public_gists: user.public_gists ?? 0,
    avatar_url: user.avatar_url ?? undefined,
    last_updated: new Date(),
    // The following fields are left undefined unless you want to map them:
    document_category: undefined,
    document_summary: undefined,
    document_summary_embedding: undefined,
    document: undefined,
    document_embedding: undefined,
  };
}
