import type { SimpleRepository } from './utils/regex.js';
import pLimit from 'p-limit';
import logger from './utils/logger.js';
import { RepositoryService, GitHubRepoFromGraphQlModified } from '@dfb/octokit';
import { GitHubRepositoryEntity } from '@dfb/db';
import { findUniquePrRepos } from './utils/urls.js';
import DataConfig from './config/index.js';

export async function fetchRepositoriesFromGitHub(
  configData: DataConfig
): Promise<void> {
  if (!configData || !configData.githubClient) {
    logger.error(
      'GitHub API client is not initialized. Please check your configuration and ensure a valid GitHub token is provided.'
    );
    return;
  }

  const repos = await findUniquePrRepos(configData);

  if (!repos || repos.length === 0) {
    logger.warn('No repositories provided to fetch.');
    return;
  }

  const apiClient = configData.githubClient;
  const repoService = new RepositoryService(apiClient);

  // Limit concurrency to avoid API rate limits and DB overload
  const limit = pLimit(5);

  // Fetch repo data in parallel with limited concurrency
  const repoData = await Promise.all(
    repos.map(repo =>
      limit(async () => {
        try {
          const repoData = await repoService.getRepositoryGraphql(
            repo.org,
            repo.repo
          );
          if (!repoData) return;

          const normalizedRepo =
            normalizeGitHubRepositoryToDatabaseRepository(repoData);
          if (!normalizedRepo) return;

          configData?.repositories?.add(normalizedRepo);

          // Insert the normalized repo into the database
          await configData?.db?.databaseServices?.repositoryService.insertBatch(
            [normalizedRepo]
          );
          return;
        } catch (err) {
          logger.error(
            `Failed to fetch repo for ${repo.org}/${repo.repo}: ${err instanceof Error ? err.message : String(err)}`
          );
          return undefined; // Explicitly return undefined on error
        }
      })
    )
  );

  return;
}

/**
 * Normalize a GitHubRepoFromGraphQlModified (GraphQL API result) to a GitHubRepositoryEntity (DB entity).
 * Handles field mapping, null/undefined values, and type conversions as needed.
 */
export function normalizeGitHubRepositoryToDatabaseRepository(
  repo: GitHubRepoFromGraphQlModified,
  keepOnlyActiveRepositories = true
): GitHubRepositoryEntity | null {
  if (keepOnlyActiveRepositories && (repo.isArchived || repo.isDisabled)) {
    logger.warn(`Skipping archived/disabled repository: ${repo.nameWithOwner}`);
    return null as unknown as GitHubRepositoryEntity; // or throw an error, or handle as needed
  }
  return {
    id: repo.id?.toString() ?? '',
    name: repo.name,
    name_with_owner: repo.nameWithOwner,
    url: repo.url,
    description: repo.description ?? '',
    stargazer_count:
      typeof repo.stargazerCount === 'number' ? repo.stargazerCount : 0,
    fork_count: typeof repo.forkCount === 'number' ? repo.forkCount : 0,
    is_private: !!repo.isPrivate,
    is_fork: !!repo.isFork,
    is_archived: !!repo.isArchived,
    is_disabled: !!repo.isDisabled,
    primary_language: repo.primaryLanguage?.name,
    license_info: repo.licenseInfo?.name,
    owner: repo.owner?.login ?? '',
    disk_usage: repo.diskUsage,
    created_at: repo.createdAt,
    updated_at: repo.updatedAt,
    pushed_at: repo.pushedAt,
    watchers_count: repo.watchers?.totalCount,
    issues_count: repo.issues?.totalCount,
    pull_requests_count: repo.pullRequests?.totalCount,
    topics: Array.isArray(repo.topics?.nodes)
      ? repo.topics.nodes
          .map(node => node.topic?.name)
          .filter(Boolean)
          .join(',')
      : undefined,
    readme: repo.readme?.text,
    workflow_status: undefined, // To be updated by workflow summary logic
    dependabot_alerts_status: undefined, // To be updated by dependabot logic
  };
}
