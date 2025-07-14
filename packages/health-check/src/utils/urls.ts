import DataConfig from '../config/index.js';
import { extractOrgAndRepo, SimpleRepository } from './regex.js';

export function findUniqueRepoUrls(urls: string[]): SimpleRepository[] {
  if (!urls || urls.length === 0) {
    return [];
  }
  const orgRepos = extractOrgAndRepo(urls);
  if (!orgRepos || orgRepos.length === 0) {
    throw new Error(
      'No valid organization/repository pairs found in the provided URLs.'
    );
  }
  const repoMap = new Map<string, SimpleRepository>();
  for (const { org, repo, name } of orgRepos) {
    if (org && repo) {
      const key = `${org}/${repo}`;
      if (!repoMap.has(key)) {
        repoMap.set(key, { org, repo, name });
      }
    }
  }
  return Array.from(repoMap.values());
}
export function findUniqueSimpleRepos(
  repos: SimpleRepository[]
): SimpleRepository[] {
  if (!repos || repos.length === 0) {
    return [];
  }
  const repoMap = new Map<string, SimpleRepository>();
  for (const { org, repo, name } of repos) {
    if (org && repo) {
      const key = `${org}/${repo}`;
      if (!repoMap.has(key)) {
        repoMap.set(key, { org, repo, name });
      }
    }
  }
  return Array.from(repoMap.values());
}

type OrgRepo = {
  org: string;
  repo: string;
};

export async function findUniquePrRepos(
  configData: DataConfig
): Promise<SimpleRepository[]> {
  const orgRepos: OrgRepo[] =
    await configData.db.databaseServices.contributorIssuePrService.getUniqueOrgsAndRepos();
  if (!orgRepos || orgRepos.length === 0) {
    return [];
  }

  const simpleArray = orgRepos.map(
    ({ org, repo }) =>
      ({
        org,
        repo,
        name: `${org}/${repo} (from PRs)`,
      }) as SimpleRepository
  );
  return simpleArray;
}
