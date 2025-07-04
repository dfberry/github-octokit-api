import GitHubApiClient from '../github2/api-client.js';
import { ContributorService } from '../github2/contributor-service.js';
import { findUniquePrRepos } from './urls.js';
import type { OctokitSearchIssue } from '../github2/models.js';

/**
 * Given an array of OctokitSearchIssue, return an array of unique active SimpleRepository objects.
 */
export async function getUniqueActiveSimpleRepositories(
  totalPrs: OctokitSearchIssue[]
): Promise<SimpleRepository[]> {
  const simpleRepositories: SimpleRepository[] = findUniquePrRepos(totalPrs);
  if (!simpleRepositories || simpleRepositories.length === 0) {
    return [];
  }
  const apiClient = new GitHubApiClient();
  const contributorService = new ContributorService(apiClient);
  const activeRepos = (
    await Promise.all(
      simpleRepositories.map(async repo => {
        const isActive = await contributorService.isActiveRepository(
          repo.org,
          repo.repo
        );
        return isActive ? repo : null;
      })
    )
  ).filter(Boolean) as SimpleRepository[];
  return activeRepos;
}
import { SimpleRepository, extractOrgAndRepo } from './regex.js';

export const convertIssueToSimpleRepo = (issue: any): SimpleRepository => {
  const defaultValue: SimpleRepository = {
    name: '',
    org: '',
    repo: '',
  };

  if (!issue || !issue.url) {
    return defaultValue;
  }

  // Always treat issue.url as a string here
  const [result] = extractOrgAndRepo([issue.url]);
  if (!result) {
    return defaultValue;
  }

  return {
    name: issue.url || '',
    org: result.org,
    repo: result.repo,
  };
};
